import { App, TFile } from "obsidian";
import ThePlugin from "./main";
import NavData from "./data";

export default async function TFile2NavData(file: TFile, plugin: ThePlugin): Promise<NavData> {
    let { app, regex, dv } = plugin;
    let content = await app.vault.cachedRead(file),
        lines = content.split("\n"),
        dfile = dv.page(file.path),
        lists = dfile.file.lists.groupBy((p) => p.list),
        listItems: ListItem[] = [],
        headers = app.metadataCache.getFileCache(file)?.headings;
    for (let i = 0; i < lists.length; i++) {
        let list: any[] = lists[i].rows.array();
        if (list.some((p) => p.children.length != 0)) {
            listItems = listItems.concat(
                list
                    .filter((p) => !p?.parent)
                    .map((p) => {
                        let children: ListItemChildren[] = p.children
                            .map((c) => Text2ListItemChildren(c.text, regex, app, file))
                            .filter((p) => p);
                        return {
                            title: p.text,
                            file,
                            path: file.path,
                            children,
                            outlinks: children.map((p) => p.path),
                        } as ListItem;
                    })
            );
        } else {
            let line = lines[lists[i].key - 1],
                listItem: ListItem = {
                    title: "",
                    file: null,
                    path: "",
                    outlinks: [],
                    children: [],
                };
            listItem.file = file;
            listItem.path = file.path;
            if (!line || line == "") {
                listItem.title = headers
                    .filter((p) => p.position.start.line < list[0].position.start.line)
                    .sort((p) => p.position.start.line)
                    .reverse()[0].heading;
            } else listItem.title = line;
            listItem.children = list
                .filter((p) => !p?.parent)
                .map((p) => Text2ListItemChildren(p.text, regex, app, file))
                .filter((p) => p);
            // if (listItem.children.length < 2) continue;
            listItem.outlinks = listItem.children.map((p) => p.path);
            listItems.push(listItem);
        }
    }
    let navbox = app.metadataCache.getFileCache(file).frontmatter?.navbox;
    return {
        file,
        listItems,
        outlinks: listItems.map((p) => p.outlinks).flat(),
        title: typeof navbox == "string" ? navbox : file.basename,
    };
}

function Text2ListItemChildren(
    text: string,
    regex: RegExp,
    app: App,
    file: TFile
): ListItemChildren {
    let t = regex.exec(text);
    if (!t?.[1]) return null;
    if (!text.startsWith(t?.[0])) return null;
    // if (t[1].length / text.length < 1 / 25) return null;
    let tfile = app.metadataCache.getFirstLinkpathDest(t[1], file.path);
    if (!tfile) return null;
    return {
        file: tfile,
        path: tfile.path,
        name: t[1],
        linkText: t[1] + (t?.[2] ?? ""),
        display: t?.[3]?.slice(1),
    } as ListItemChildren;
}

export type ListItem = {
    title: string;
    file: TFile;
    path: string;
    outlinks: string[];
    children: ListItemChildren[];
};

export type ListItemChildren = {
    name: string;
    file: TFile;
    path: string;
    display?: string;
    linkText: string;
};
