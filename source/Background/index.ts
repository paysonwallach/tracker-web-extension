import DOMPurify from "dompurify"
import { Readability } from "@mozilla/readability"
import normalizeUrl from "normalize-url"
import hash from "tlsh"
import DigestHashBuilder from "tlsh/lib/digests/digest-hash-builder"
import { browser, Runtime } from "webextension-polyfill-ts"

import { Lazy } from "Utils/Lazy"
import { Config } from "Common/Config"
import {
    Method,
    GetHashRequest,
    GetHashResult,
    PageData,
    UpdateStoreRequestData,
    UpdateStoreRequest,
} from "Common/Protocol"
import logs from "Common/Logging"
import optionsStorage from "Common/Options"

type ParseResult<T = string> = null | {
    title: string
    byline: string
    dir: string
    content: T
    textContent: string
    length: number
    excerpt: string
    siteName: string
}

const DIFFERENCE_THRESHOLD = 5

class Page {
    private reader: Readability<string>
    private _content?: ParseResult
    private _contentHash?: string
    url: string

    public get content() {
        if (this._content === undefined) this._content = this.reader.parse()

        return this._content
    }

    public get contentHash() {
        if (this._contentHash === undefined)
            try {
                this._contentHash =
                    this.content == null ? "" : hash(this.content.textContent)
            } catch (err) {
                logs.error(err)
            }

        return this._contentHash
    }

    constructor(
        url: string,
        content: string,
        mime_type: SupportedType = "text/html"
    ) {
        this.url = url
        this.reader = new Readability(
            new DOMParser().parseFromString(
                DOMPurify.sanitize(content),
                mime_type
            )
        )
    }

    public onGetHashResult(result: GetHashResult) {
        let difference: number | null = null
        if (result.error === null && this.contentHash !== undefined) {
            difference = this.compareHashes(result.data!.hash, this.contentHash)
        }
        if (difference !== null && difference < DIFFERENCE_THRESHOLD) {
            logs.debug(`difference beneath threshold: ${difference}`)
            return
        }

        if (this.content !== null && this.contentHash !== undefined)
            hostBridge.instance.postMessage(
                new UpdateStoreRequest(
                    new UpdateStoreRequestData(
                        this.contentHash,
                        new PageData(
                            this.content.title,
                            this.content.excerpt,
                            this.content.textContent
                        )
                    ),
                    this.url
                )
            )
    }

    private compareHashes(hash1: string, hash2: string): number {
        const digest1 = new DigestHashBuilder().withHash(hash1).build()
        const digest2 = new DigestHashBuilder().withHash(hash2).build()

        return digest2.calculateDifference(digest1, true)
    }
}

const pages: Record<string, Page> = {}

const hostBridge = new Lazy<Runtime.Port>(() =>
    browser.runtime.connectNative(Config.HOST_BRIDGE_ID)
)

const getExcludeList = async (): Promise<string[]> => {
    return (await optionsStorage.getAll()).excludelist.split(",")
}

const onTabEvent = async (tabId: number, tabUrl: string) => {
    try {
        logs.debug(`checking '${tabUrl}' against exclusion list...`)
        const excludeList = await getExcludeList()

        if (tabId === undefined || tabUrl === undefined) {
            logs.error(`undefined tab id or url`)
            return
        }

        const url = normalizeUrl(tabUrl)
        const urlComponents = new URL(url)
        if (
            !excludeList
                .map(
                    (domain) =>
                        urlComponents.hostname
                            .split(".")
                            .slice(-2)
                            .join(".") === domain.trim()
                )
                .reduce((result, item) => result || item)
        ) {
            logs.debug(`dispatching content script to '${tabUrl}'...`)
            browser.tabs.executeScript(tabId, {
                file: "contentScript.js",
            })
        }
    } catch (err) {
        logs.error(err)
    }
}

hostBridge.instance.onMessage.addListener((message, sender) => {
    logs.debug(
        `received message on host port from ${JSON.stringify(
            sender
        )}: ${JSON.stringify(message)}`
    )
    if (sender.name != Config.HOST_BRIDGE_ID) return

    switch (message.method) {
        case Method.GetHash:
            pages[message.context].onGetHashResult(message)
            break
        case Method.UpdateStore:
            if (message.data.success) delete pages[message.context]
            else logs.error(`error: ${message.error.description}`)
            break
        default:
            logs.error(`unknown method requested: ${message.method}`)
    }
})
browser.runtime.onMessage.addListener((message, sender) => {
    logs.debug(
        `received runtime message from ${JSON.stringify(
            sender
        )}: ${JSON.stringify(message)}`
    )
    if (sender.id != Config.EXTENSION_ID) return

    pages[message.data.url] = new Page(message.data.url, message.data.body)

    logs.debug(`dispatching hash request to host...`)
    hostBridge.instance.postMessage(
        new GetHashRequest(message.data.url, message.data.url)
    )
})
browser.tabs.onCreated.addListener((tab) => {
    logs.debug(`tab created...`)
    if (tab.id !== undefined && tab.url !== undefined)
        onTabEvent(tab.id, tab.url)
})
browser.tabs.onUpdated.addListener((tabId, changed) => {
    logs.debug(`tab changed...`)
    if (changed.url !== undefined) {
        onTabEvent(tabId, changed.url)
    }
})
