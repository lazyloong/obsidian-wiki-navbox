import { Plugin, TFile, WorkspaceLeaf, MarkdownView, TFolder } from "obsidian";
import NavData from "./data";
import TFile2NavData from "./parser";
import NavboxManager from "./manager";

interface TheSettings {
    mySetting: string;
}
const DEFAULT_SETTINGS: TheSettings = {
    mySetting: "default",
};
export default class ThePlugin extends Plugin {
    settings: TheSettings;
    navboxFiles: TFile[];
    navDatas: NavData[];
    async onload() {
        await this.loadSettings();

        runOnLayoutReady(() => {
            this.loadNavData();
            this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
                this.leafAddManager(leaf);
            });
            this.registerEvent(
                this.app.vault.on("create", (file) => {
                    if (file instanceof TFolder) return;
                    let file_ = file as TFile;
                    this.navDatas
                        .filter((p) =>
                            p.listItems.some((p) =>
                                p.children.find((p) => !p.file && p.name == file_.basename)
                            )
                        )
                        .forEach((p) => this.updateNavData(p.file));
                })
            );
        });

        this.registerEvent(
            this.app.workspace.on("file-open", () => {
                let leaf = this.app.workspace.getMostRecentLeaf();
                this.leafAddManager(leaf);
            })
        );
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", (leaf) => {
                this.leafAddManager(leaf);
            })
        );
        this.registerEvent(
            this.app.metadataCache.on("changed", (file) => {
                this.updateNavData(file);
            })
        );
        this.registerEvent(
            this.app.vault.on("rename", (file, oldPath) => {
                if (file instanceof TFolder) return;
                this.navDatas
                    .filter((p) => p.outlinks.includes(oldPath))
                    .forEach((p) => this.updateNavData(p.file));
            })
        );
        this.registerEvent(
            this.app.vault.on("delete", (file) => {
                if (file instanceof TFolder) return;
                this.navDatas
                    .filter((p) => p.outlinks.includes(file.path))
                    .forEach((p) => this.updateNavData(p.file));
            })
        );
    }
    async updateNavData(file: TFile) {
        if (this.navboxFiles.includes(file)) {
            this.navDatas = this.navDatas.filter((d) => d.file.path != file.path);
            if (this.app.metadataCache.getFileCache(file).frontmatter?.navbox)
                this.navDatas.push(await TFile2NavData(file, this));
            else this.navboxFiles = this.navboxFiles.filter((f) => f.path != file.path);
        } else if (this.app.metadataCache.getFileCache(file).frontmatter?.navbox) {
            this.navboxFiles.push(file);
            this.navDatas.push(await TFile2NavData(file, this));
        }
    }
    loadNavData() {
        this.navboxFiles = this.app.vault
            .getMarkdownFiles()
            .filter((f) => this.app.metadataCache.getFileCache(f)?.frontmatter?.navbox);
        this.navDatas = [];
        this.navboxFiles.forEach(async (f) => this.navDatas.push(await TFile2NavData(f, this)));
    }
    checkNavData(): boolean {
        let set = new Set(this.navDatas.map((d) => d.file.path));
        let check = this.navboxFiles.every((f) => set.has(f.path));
        if (!check) this.loadNavData();
        return check;
    }
    leafAddManager(leaf: WorkspaceLeaf) {
        if (leaf.view.getViewType() != "markdown") return;
        let view = leaf.view as MarkdownView;
        if (view.navboxManager) {
            view.navboxManager.render(view.file);
        } else {
            let manager = new NavboxManager(view, this);
            view.addChild(manager);
            view.navboxManager = manager;
        }
    }
    onunload() {}
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
}

function runOnLayoutReady(calback: Function) {
    if (app.workspace.layoutReady) calback();
    else app.workspace.onLayoutReady(() => calback());
}
