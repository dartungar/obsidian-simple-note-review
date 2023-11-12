# Simple Note Review
Simple and flexible plugin for note review, resurfacing, and repetition.

> IMPORTANT: this plugin uses [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin as its search engine. 
Please make sure you have Dataview plugin installed.

### Is this a spaced repitition plugin?
Not quite.

This is a plugin for people who want to review, resurface, and rediscover their notes, but do not want to build a rigid system with a schedule.

The philosophy is: "define a set of notes and review them at your own pace". 

## How does it work?
#### Define a note set based on tags, folders, or a dataviewJS query.
Simple Note Review can create a noteset with a flexible set of rules: tags and/or folders, creation date, or even a dataviewJS query.
A note can be in any number of note sets.

![image](https://github.com/dartungar/obsidian-simple-note-review/assets/36126057/60c9501c-aa4c-4d09-bd77-4ebf2dd9bb0b)

#### Use toolbar or commands for reviewing
When you start a review of a noteset for the first time, the plugin creates a persistent queue with all the notes in this noteset.

You can proceed reviewing notes in order, or choose a random one.

If you want to start a fresh review, reset the noteset queue with corresponding button on the sidebar or a command.

IMPORTANT: review queue does not update automatically, so it's always best to reset the queue when starting a new review!

![sidebar](https://github.com/dartungar/obsidian-simple-note-review/assets/36126057/f85c88f9-819f-40ec-a5ee-2db623d32733)

#### Review or skip note
To review or skip a note, click button on a sidebar or use a corresponding command.
Skipping a note removes it from a current review queue; it will be back when you reset the queue.

![review-note](https://github.com/dartungar/obsidian-simple-note-review/assets/36126057/9d18dc36-2c98-43bb-8101-12d8cf7cc313)


#### Change review frequency for notes or exclude them from reviews
You can optionally set each note's review frequency in the sidebar on via command:
- high
- normal
- low
- ignore (exclude from all reviews)

#### What does "current note set" mean?
It is a note set you are currently reviewing. 
Since one note can be in any number of note sets, the plugin needs to understand which queue to use.

#### Noteset Stats
You can see noteset stats in settings or in sidebar.

![image](https://github.com/dartungar/obsidian-simple-note-review/assets/36126057/257d2a64-60fc-470d-8649-9541b47159cf)

