
<p align="center">
<img src="https://github.com/user-attachments/assets/131842f5-1016-43d7-8745-5cab5029c276" alt="logo" width="450">
  <br>
  A browser-based visual editor for designing encounters in ONB<br>
</p>

## Getting Started

<img src="https://github.com/user-attachments/assets/f20e9890-4e32-4caa-bbb0-37fc4d39634e" align="right" alt="interface" width="450">
<p align="justify">
To launch the editor, <b><a href="https://indianajson.github.io/visual-encounters/index.html" target="_blank">CLICK HERE</a></b>. While you can import existing configs, they can only contain encounter configurations and the return string (no functions, comments, etc) so you are better off creating new configurations with the tool and then importing those if you wish to change them later. 
</p><p align="justify">
The editor's interface has three main sections: main menu (at top), battle preview (in middle), and settings (at bottom). To change the settings for any given tile simply click on the tile to select it and the menu options will change at the bottom.  To edit the encounter's main settings (such as music file, callback function, freedom mission settings, etc) unselect the currently selected tile by clicking on it again.
</p>
<p align="justify">
Feel free to ping @indianajson on the Discord if you have any problems. </p>
<p align="justify">
<b>IMPORTANT</b>: This editor modifies and creates configuration files compatible specifically with <a href="https://github.com/Keristero/ezlibs-scripts#ezencounters">Keristero's ezEncounters library</a> you will need to set up ezLibs on your server in order for the configuration files made with this tool to function. That said, this tool DOES supply the mods so if you use something outside of ezEncounter's defaults tick the box labeled "Download mods?" and it will download the necessary mods for you to add to your server. You will need to also include the custom `ezencounters.zip` provided with the mods when you download your config.</p>

## Features

- Mod files are included with the tool for easily updating your server with the necessary files (no need to visit the mod site).
- Interface can be set between a light and dark mode. 
- Changes are saved every time in your browser so you can close the page and come back later without losing your progress (does not work in Incognito/Private browsing sessions).
- Multiple encounters per configuration file.
- Almost all publicly available ONB Enemy mods are included. 
- Settings (music, freedom missions, callback functions) are definable within the editor. 
- Allows for multiple players on field for PVP and coop encounters.

## Known Limitations

- Importing works well IF the lua only contains encounter variables and a return (other functions, comments, etc. break the importer).
- Each encounter can only have one table for positions so you have to make separate variations if you want different mob placement.

## Special Thanks

- **[Keristero](http://github.com/keristero/)** for making ezEncounters.
- **[CyanMan.EXE](https://x.com/CyanmanEXE)** for extensive bug testing.
- **Head DM** for finding the first serious bug after release.

