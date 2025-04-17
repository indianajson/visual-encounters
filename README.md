
<p align="center">
<img src="https://github.com/user-attachments/assets/131842f5-1016-43d7-8745-5cab5029c276" alt="logo" width="450">
  <br>
  A browser-based visual editor for designing encounters in ONB<br>
</p>

## Getting Started

To use the editor, visit https://indianajson.github.io/visual-encounters/ to use the editor. While you can import existing configs, they can only contain encounter configurations and the return string (no functions, comments, etc) so you are better off creating new configurations with the tool and then importing those if you wish to change them later. 

The editor's interface (see below) has three main sections: main menu (at top), battle preview (in middle), and settings (at bottom). To change the settings for any given tile simply click on the tile to select it and the menu options will change at the bottom.  To edit the encounter's main settings (such as music file, callback function, freedom mission settings, etc) unselect the currently selected tile by clicking on it again.

<p align="center">
<img src="https://github.com/user-attachments/assets/f20e9890-4e32-4caa-bbb0-37fc4d39634e" alt="interface" width="450">
</p>

Feel free to ping @indianajson on the Discord if you have any problems. 

IMPORTANT: This editor modifies and creates configuration files compatible specifically with [Keristero's ezEncounters library](https://github.com/Keristero/ezlibs-scripts#ezencounters) you will need to set up ezLibs on your server in order for the configuration files made with this tool to function. 

## Features

- All progress is saved in your browser so you can close the page and come back later without losing your progress (does not work in Incognito/Private browsing sessions).
- Add multiple encounters to a single configuration file.
- All settings (music, freedom missions, callback functions) are definable within the editor. 
