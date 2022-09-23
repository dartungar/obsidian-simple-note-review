# Simple Note Review
Simple and flexible plugin for easy note review, resurfacing, and repetition.

> IMPORTANT: this plugin uses amazing [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin as its search engine. 
Please make sure you have Dataview plugin installed.

### Build flexible note sets for reviewing
Build custom note sets for reviewing based on tags, folders, or DataviewJS-style queries.
Customize note set's name and query logic.

![noteset-settings](https://user-images.githubusercontent.com/36126057/184475626-31bce911-de9f-4afa-863c-8489b6da2cc3.png)

### Easy reviewing
Review notes based on the date they were last reviewed. 
Notes with no reviewed date will be first in note set.
Mark notes as rewieved today with one command.

![noteset-select-modal](https://user-images.githubusercontent.com/36126057/184475623-76551710-f945-497e-bb53-499098a03c19.png)

### Review frequency
You can optionally set each note's review frequency:
- high
- normal
- low
- ignore

### Review algorithms
##### Default
Makes notes with earlier review dates appear first.
If review frequency is set, notes with higher review frequency will rank significantly higher than those with lower review frequency.
##### Random
Takes a random note from the current set.

### Review statistics
See note set's details: 
- what notes are included in the set
- how many notes are included in the set
- how many notes are reviewed in last 7, 30 days
- how many notes are not reviewed yet

![noteset-info](https://user-images.githubusercontent.com/36126057/184475652-df894054-208b-40b0-a92a-2304961119e6.png)
