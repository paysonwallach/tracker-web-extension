import { browser } from "webextension-polyfill-ts"

browser.runtime.sendMessage({
    data: {
        url: document.URL,
        body: document.documentElement!.outerHTML,
        mime: document.contentType,
    },
})
