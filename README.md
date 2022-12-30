# Simple Note Review
Simple and flexible plugin for easy note review, resurfacing, and repetition.

> IMPORTANT: this plugin uses amazing [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin as its search engine. 
Please make sure you have Dataview plugin installed.

### Build flexible note sets for reviewing
Build custom note sets for reviewing based on tags, folders, or DataviewJS-style queries.
Customize note set's name and query logic.

![noteset_example_1](https://user-images.githubusercontent.com/36126057/208353981-756c526e-f42a-4981-be03-fa0b479a1dbc.jpg)

### Easy reviewing
Review notes based on the date they were last reviewed. 
Notes with no reviewed date will be first in note set.
Mark notes as rewieved today with one command.

![noteset-select-modal](https://user-images.githubusercontent.com/36126057/187531666-55f6b7fc-7e14-4184-ac3e-f37843bd3a94.png)

### Review frequency
You can optionally set each note's review frequency:
- high
- normal
- low
- ignore

### Review algorithms
![note-review-frequency](https://user-images.githubusercontent.com/36126057/192049630-bb1455eb-e2b1-4abd-9440-beb8dfac7818.png)
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

![noteset-info](https://user-images.githubusercontent.com/36126057/187531702-4de555fe-6229-4885-92a1-a591bbc33615.png)
