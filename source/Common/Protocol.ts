import { v4 as uuid } from "uuid"
import { JsonProperty, Serializable } from "typescript-json-serializer"

export enum Method {
    Event = "event",
    GetHash = "get-hash",
    UpdateStore = "update-store",
    CheckHashes = "check-hashes",
    GetPageData = "get-page-data",
}

@Serializable()
class Error {
    constructor(
        @JsonProperty()
        public readonly code: number,
        @JsonProperty()
        public readonly description?: string
    ) {}
}

@Serializable()
export class Message {
    @JsonProperty()
    public readonly apiVersion: string = "v1"

    @JsonProperty()
    public readonly id: string = uuid()

    @JsonProperty()
    public readonly method: string

    @JsonProperty()
    public readonly context: string | null

    constructor(method: string, context: string | null = null) {
        this.method = method
        this.context = context
    }
}

@Serializable()
export class Event extends Message {
    constructor(
        @JsonProperty()
        public readonly name: string
    ) {
        super(Method.Event)
    }
}

@Serializable()
export class GetHashRequest extends Message {
    constructor(
        @JsonProperty()
        public readonly tabId: string,
        @JsonProperty()
        public readonly url: string
    ) {
        super(Method.GetHash)
    }
}

@Serializable()
export class GetHashResultData {
    constructor(
        @JsonProperty()
        public readonly hash: string,
        @JsonProperty()
        public readonly url: string
    ) {}
}

@Serializable()
export class GetHashResult extends Message {
    @JsonProperty()
    data?: GetHashResultData

    @JsonProperty()
    error?: Error

    constructor(context: string) {
        super(Method.GetHash, context)
    }
}

@Serializable()
export class CheckHashesRequest extends Message {
    constructor(
        @JsonProperty()
        public readonly hash: string
    ) {
        super(Method.CheckHashes)
    }
}

@Serializable()
export class CheckHashesResultData {
    constructor(
        @JsonProperty()
        public readonly difference: number
    ) {}
}

@Serializable()
export class CheckHashesResult extends Message {
    constructor(
        @JsonProperty()
        public readonly data?: CheckHashesResultData,
        @JsonProperty()
        public readonly error?: Error
    ) {
        super(Method.CheckHashes)
    }
}

@Serializable()
export class GetPageDataRequest extends Message {
    constructor() {
        super(Method.GetPageData)
    }
}

@Serializable()
export class PageData {
    constructor(
        @JsonProperty()
        public readonly title: string,
        @JsonProperty()
        public readonly excerpt: string,
        @JsonProperty()
        public readonly textContent: string
    ) {}
}

@Serializable()
export class GetPageDataResultData {
    constructor(
        @JsonProperty()
        public readonly hash: string,
        @JsonProperty()
        public readonly page: PageData
    ) {}
}

@Serializable()
export class GetPageDataResult extends Message {
    constructor(
        @JsonProperty()
        public readonly data?: GetPageDataResultData,
        @JsonProperty()
        public readonly error?: Error
    ) {
        super(Method.GetPageData)
    }
}

@Serializable()
export class UpdateStoreRequestData extends GetPageDataResultData {}

@Serializable()
export class UpdateStoreRequest extends Message {
    constructor(
        @JsonProperty()
        public readonly data: UpdateStoreRequestData,
        context: string
    ) {
        super(Method.UpdateStore, context)
    }
}

@Serializable()
export class UpdateStoreResultData {
    constructor(
        @JsonProperty()
        public readonly success: boolean
    ) {}
}

@Serializable()
export class UpdateStoreResult extends Message {
    @JsonProperty()
    data?: UpdateStoreResultData

    @JsonProperty()
    error?: Error

    constructor() {
        super(Method.UpdateStore)
    }
}
