import { App, TFile } from "obsidian";
import { ListItem } from "./parser";

export default class NavData {
    file: TFile;
    listItems: ListItem[];
    outlinks: string[];
    title: string;
    constructor(app: App, listItem: ListItem[], file: TFile) {
        this.file = file;
        this.listItems = listItem;
        this.outlinks = this.listItems.map((p) => p.outlinks).flat();
        let navbox = app.metadataCache.getFileCache(file).frontmatter?.navbox;
        this.title = typeof navbox == "string" ? navbox : this.file.basename;
    }
}
