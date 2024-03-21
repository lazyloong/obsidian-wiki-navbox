import { Component, MarkdownView, TFile } from "obsidian";
import SwitchObserver from "./switchObserver";
import NavboxRenderer from "./renderer";
import NavData from "./data";
import ThePlugin from "./main";

export default class NavboxManager extends Component {
    observer: SwitchObserver;
    renderers: NavboxRenderer[] = [];
    datas: NavData[] = [];
    constructor(public view: MarkdownView, public plugin: ThePlugin) {
        super();
    }
    onload(): void {
        this.observer = new SwitchObserver(this.view);
        this.addChild(this.observer);
        this.observer.on(() => {
            this.render(this.view.file);
        });
        this.render(this.view.file);
    }
    render(file: TFile) {
        this.renderers.forEach((r) => {
            r.empty();
            this.removeChild(r);
        });
        setTimeout(() => {
            this.render_(file);
        }, 100);
    }
    render_(file: TFile) {
        this.datas = this.plugin.navDatas.filter((n) => n.outlinks.includes(file.path));
        this.renderers = this.datas.map((d) => {
            let r = new NavboxRenderer(this.plugin.app, d, this.plugin);
            this.addChild(r);
            return r;
        });

        let mode = this.view.getMode();
        let containerEl = this.view.containerEl;
        let toAppendElement: Element;

        toAppendElement = containerEl.querySelector(mode == "source" ? ".cm-sizer" : ".mod-footer");

        let div =
            toAppendElement.querySelector(".navbox-div") ??
            toAppendElement.createEl("div", { cls: "navbox-div" });
        div.empty();
        div.parentElement.appendChild(div);
        this.renderers.forEach((n) => n.render(div, file.path));
    }
}
