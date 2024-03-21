import { Component, View } from "obsidian";

export default class SwitchObserver extends Component {
    observers: MutationObserver;
    callbacks: Function[] = [];
    constructor(public view: View) {
        super();
        this.observers = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "attributes" && mutation.attributeName === "data-mode") {
                    this.callbacks.forEach((callback) => callback());
                }
            });
        });
    }
    onload(): void {
        this.observers.observe(this.view.containerEl, { attributes: true });
    }
    onunload(): void {
        this.observers.disconnect();
    }
    on(callback: Function) {
        this.callbacks.push(callback);
    }
}
