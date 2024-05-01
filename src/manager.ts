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
        this.renderers.forEach((r) => this.removeChild(r));
        this.plugin.checkNavData();
        let f = () => {
            if (this.getToAddElement()) this.render_(file);
            else setTimeout(f, 10);
        };
        f();
    }
    render_(file: TFile) {
        this.datas = this.plugin.navDatas.filter(
            (n) => n.outlinks.includes(file.path) || n.file.path == file.path
        );
        this.renderers = this.datas.map((d) => this.addChild(new NavboxRenderer(d, this.plugin)));

        let toAppendElement = this.getToAddElement();

        let div =
            toAppendElement.querySelector<HTMLDivElement>(".navbox-div") ??
            toAppendElement.createEl("div", { cls: "navbox-div" });
        div.empty();
        div.parentElement.appendChild(div);
        this.renderers.forEach((n) => n.render(div, file.path));
        div.style.minHeight = div.offsetHeight + "px";
    }
    getToAddElement() {
        let mode = this.view.getMode();
        let containerEl = this.view.containerEl;
        return containerEl.querySelector(mode == "source" ? ".cm-sizer" : ".mod-footer");
    }
}
