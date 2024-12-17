import { TFile } from "obsidian";
import { ListItem } from "./parser";

export default interface NavData {
    file: TFile;
    listItems: ListItem[];
    outlinks: string[];
    title: string;
    otherNavbox: string[];
}
