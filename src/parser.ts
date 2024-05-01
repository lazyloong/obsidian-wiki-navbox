import { TFile } from "obsidian";
import ThePlugin from "./main";
import NavData from "./data";
import { Text2TFile, parseLinktext, parseTable } from "./utils";

export default async function TFile2NavData(file: TFile, plugin: ThePlugin): Promise<NavData> {
    let { app } = plugin;
    let content = await app.vault.cachedRead(file),
        navListItems: ListItem[] = [],
        metadataCache = app.metadataCache.getFileCache(file);
    let { sections, headings, listItems, links } = metadataCache;
    if (!sections) return;

    let lists = sections
        .filter((p) => p.type == "list")
        .map((p) =>
            listItems
                .filter(
                    (q) =>
                        q.position.start.line >= p.position.start.line &&
                        q.position.end.line <= p.position.end.line
                )
                .map((p) => ({
                    ...p,
                    content: content.slice(p.position.start.offset, p.position.end.offset),
                    link: links?.find((q) => q.position.start.line == p.position.start.line),
                }))
        );

    // 单层列表，表头为标题，内容为列表项
    if (headings) {
        for (const list of lists) {
            let linkTexts = list.map((p) => p.link).filter((p) => p);
            if (linkTexts.length == 0) continue;
            if (!list.every((p) => p.parent < 0)) continue;
            let title = headings
                .filter((p) => p.position.start.line < list[0].position.start.line)
                .slice(-1)[0].heading;
            let children = linkTexts.map((p) => {
                let tfile = Text2TFile(p.link, app, file);
                return {
                    file: tfile,
                    display: p?.displayText,
                    path: tfile?.path,
                    name: tfile?.basename ?? p.link,
                };
            });

            navListItems.push({
                title,
                position: list[0].position.start.line,
                outlinks: children.map((p) => p.path),
                children,
            });
        }
    }

    // 两层列表，表头为一级列表项，内容为子列表项
    for (let list of lists) {
        let linkTexts = list.map((p) => parseLinktext(p.content)).filter((p) => p);
        if (linkTexts.length == 0) continue;
        if (!list.some((p) => p.parent > 0)) continue;

        list.filter((p) => p.parent < 0)
            .map((p) => ({
                ...p,
                children: list.filter((q) => p.position.start.line == q.parent),
            }))
            .forEach((p) => {
                let title = content
                    .slice(p.position.start.offset, p.position.end.offset)
                    .replace(/^[-*]\s+/, "");
                let tfiles = p.children
                    .map((p) => parseLinktext(p.content))
                    .filter((p) => p)
                    .map((p) => ({ ...Text2TFile(p.path, app, file), subpath: p?.subpath }))
                    .filter((p) => p);

                navListItems.push({
                    title,
                    position: p.position.start.line,
                    outlinks: tfiles.map((p) => p.path),
                    children: tfiles.map((p) => ({
                        name: p.basename,
                        file: p,
                        path: p.path,
                        display: p.subpath,
                    })),
                });
            });
    }

    // 表格，表头为标题，内容为第一列表格项
    let tables = sections
        .filter((p) => p.type == "table")
        .map((p) => ({
            ...p,
            content: parseTable(content.slice(p.position.start.offset, p.position.end.offset)),
        }));

    for (let table of tables) {
        let { rows } = table.content;
        let linkTexts = rows.map((p) => parseLinktext(p[0])).filter((p) => p);
        if (linkTexts.length == 0) continue;
        let title = headings
            .filter((p) => p.position.start.line < table.position.start.line)
            .slice(-1)[0].heading;
        let tfiles = linkTexts
            .map((p) => ({ ...Text2TFile(p.path, app, file), subpath: p?.subpath }))
            .filter((p) => p);

        navListItems.push({
            title: title,
            position: table.position.start.line,
            outlinks: tfiles.map((p) => p.path),
            children: tfiles.map((p) => ({
                name: p.basename,
                file: Text2TFile(p.path, app, file),
                path: p.path,
                display: p.subpath,
            })),
        });
    }

    let navbox = app.metadataCache.getFileCache(file).frontmatter?.navbox;
    return {
        file,
        listItems: navListItems.sort((a, b) => a.position - b.position),
        outlinks: navListItems.map((p) => p.outlinks).flat(),
        title: typeof navbox == "string" ? navbox : file.basename,
    };
}

export type ListItem = {
    title: string;
    outlinks: string[];
    children: ListItemChildren[];
    position: number;
};

export type ListItemChildren = {
    name: string;
    file?: TFile;
    path?: string;
    display?: string;
};
