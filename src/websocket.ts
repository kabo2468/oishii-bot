import { setTimeout as sleep } from 'timers/promises';
import ws, { Data } from 'ws';
import { botVersion } from './utils/version.js';

type ListenerMap = {
    error: WebSocketEventListenerMap['error'][];
    message: WebSocketEventListenerMap['message'][];
    open: WebSocketEventListenerMap['open'][];
    close: WebSocketEventListenerMap['close'][];
};

const State = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
} as const;

type SendDataType = Data;

// 最大10秒
const retryTime = (num: number) => Math.min(1000 * num, 10000);

export class ReconnectWS {
    #ws?: ws;
    #listeners: ListenerMap = { close: [], error: [], message: [], open: [] };
    readonly #url: string;

    #isConnecting: boolean = false;
    #retryCount: number = -1;
    #connectTimeout?: ReturnType<typeof setTimeout>;
    #messageQueue?: SendDataType[];

    constructor(url: string) {
        this.#url = url;
        this.#connect();
    }

    async #connect() {
        if (this.#isConnecting) return;
        this.#isConnecting = true;

        this.#retryCount++;
        await sleep(retryTime(this.#retryCount));

        this.#ws = new ws(this.#url, {
            headers: { 'User-Agent': `oishii-bot/${botVersion} (WebSocket / https://github.com/kabo2468/oishii-bot)` },
        });
        this.#isConnecting = false;
        this.#addListener();

        this.#connectTimeout = setTimeout(() => {
            this.#handleError(new ErrorEvent(new Error('TIMEOUT'), this));
        }, 3000);
    }

    #disconnect(code: number = 1000, reason?: string) {
        clearTimeout(this.#connectTimeout);

        if (!this.#ws) return;
        try {
            this.#ws.close(code, reason);
            this.#connect();
        } catch (error) {}
    }

    #callEventListener<T extends keyof WebSocketEventListenerMap>(event: WebSocketEventMap[T], listener: WebSocketEventListenerMap[T]) {
        // @ts-ignore
        listener(event);
    }

    #addListener() {
        if (!this.#ws) return;

        this.#ws.addEventListener('open', this.#handleOpen);
        this.#ws.addEventListener('close', this.#handleClose);
        this.#ws.addEventListener('message', this.#handleMessage);
        this.#ws.addEventListener('error', this.#handleError);
    }

    #handleOpen = (event: WebSocketEventMap['open']) => {
        clearTimeout(this.#connectTimeout);

        this.#messageQueue?.forEach((m) => this.#ws?.send(m));
        this.#messageQueue = [];

        this.#listeners.open.forEach((l) => {
            this.#callEventListener(event, l);
        });
    };
    #handleClose = (event: WebSocketEventMap['close']) => {
        clearTimeout(this.#connectTimeout);

        this.#connect();

        this.#listeners.close.forEach((l) => this.#callEventListener(event, l));
    };
    #handleMessage = (event: WebSocketEventMap['message']) => {
        this.#listeners.message.forEach((l) => this.#callEventListener(event, l));
    };
    #handleError = (event: WebSocketEventMap['error']) => {
        this.#disconnect(undefined, event.message);

        this.#listeners.error.forEach((l) => this.#callEventListener(event, l));

        this.#connect();
    };

    close(code: number = 1000, reason?: string) {
        clearTimeout(this.#connectTimeout);

        if (!this.#ws) return;
        if (this.#ws.readyState === State.CLOSED) return;
        this.#ws.close(code, reason);
    }

    reconnect(code: number = 1000, reason?: string) {
        this.#retryCount = -1;
        if (!this.#ws || this.#ws.readyState === State.CLOSED) {
            this.#connect();
        } else {
            this.#disconnect(code, reason);
            this.#connect();
        }
    }

    addEventListener<T extends keyof WebSocketEventListenerMap>(type: T, listener: WebSocketEventListenerMap[T]) {
        // @ts-ignore
        this.#listeners[type].push(listener);
    }

    removeEventListener<T extends keyof WebSocketEventListenerMap>(type: T, listener: WebSocketEventListenerMap[T]) {
        // @ts-ignore
        this.#listeners[type] = this.#listeners[type].filter((l) => l !== listener);
    }

    send(data: SendDataType) {
        if (this.#ws && this.#ws.readyState === State.OPEN) {
            this.#ws.send(data);
        } else {
            this.#messageQueue?.push(data);
        }
    }
}

class Event {
    public target: any;
    public type: string;
    constructor(type: string, target: any) {
        this.target = target;
        this.type = type;
    }
}

class ErrorEvent extends Event {
    public message: string;
    public error: Error;
    constructor(error: Error, target: any) {
        super('error', target);
        this.message = error.message;
        this.error = error;
    }
}

class CloseEvent extends Event {
    public code: number;
    public reason: string;
    public wasClean = true;
    constructor(code: number = 1000, reason: string = '', target: any) {
        super('close', target);
        this.code = code;
        this.reason = reason;
    }
}

interface WebSocketEventMap {
    close: CloseEvent;
    error: ErrorEvent;
    message: ws.MessageEvent;
    open: Event;
}

interface WebSocketEventListenerMap {
    close: (event: WebSocketEventMap['close']) => void;
    error: (event: WebSocketEventMap['error']) => void;
    message: (event: WebSocketEventMap['message']) => void;
    open: (event: WebSocketEventMap['open']) => void;
}
