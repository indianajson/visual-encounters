
## Contributor's Guide
The best way you can contribute is adding new viruses to the tool, here's how!

### Step 1 - Sprite

Download and crop a sprite for the virus (PNG or WEBP with transparent background). The RockManEXE Forums is an excellent place for these, here's a list of all the games:

- https://www.therockmanexezone.com/wiki/Enemies_in_MMBN1
- https://www.therockmanexezone.com/wiki/Enemies_in_OSS
- https://www.therockmanexezone.com/wiki/Enemies_in_MMBN2
- https://www.therockmanexezone.com/wiki/Enemies_in_MMBN3
- https://www.therockmanexezone.com/wiki/Enemies_in_MMBN4
- https://www.therockmanexezone.com/wiki/Enemies_in_EXE4.5
- https://www.therockmanexezone.com/wiki/Enemies_in_MMBN5
- https://www.therockmanexezone.com/wiki/Enemies_in_MMBN6
- https://www.therockmanexezone.com/wiki/Enemies_in_PoN
- https://www.therockmanexezone.com/wiki/Enemies_in_LoN

Place the enemie sprite image in the /enemies folder. 

### Step 2 - Mod

Download the ZIP for the mod from the Discord thread or Keristero's mod site (https://onb.keristero.com/) and put it in the /mods folder. Eventually we should update to pull mods directly from Keristero's site. 

### Step 3 - Update encounters.zip

Unzip `encounters.zip` inside the /mods folder. Then add the virus to the entry.lua file (using a unique name and the name of the package from the mod itself). 

Re-zip the updated `ezencounters.zip` by placing the unzipped folder in your ONB client's resources/enemies folder and launching the client. It will automatically zip the file for you, copy this version. 

WARNING: You cannot ZIP the file yourself, it will break the ezlibs encounter plugin. 

### Step 4 - Adding the virus entry

Add the virus entry into the JSON in index.html. There is a huge wall of JSON inside the `index.html` (I should seperate it out into it's own file at some point). Here's an example of one virus' JSON:

```
{
    name: "GutsManPoN",
    nickname:"GutsMan (PoN)",
    image: "Gutsman.webp", 
    package:"com.OFC.char.EXEPoN-028-Blues",
    ranks: [
        {value: 1, name: "GutsMan"},
        {value: 2, name: "GutsMan V2"},
        {value: 3, name: "GutsMan V3"},
        {value: 4, name: "GutsMan SP"},
        {value: 8, name: "GutsMan DS"},
    ],
    rankImages: {
        1: "Gutsman.webp",
        2: "GutsmanV2.webp",
        3: "GutsmanV3.webp",
        4: "GutsmanSP.webp",
        8: "GutsmanDS.webp",
    },
    downloads:[
        "com_OFC_mob_EXEPoN_026_GutsManV1.zip",
        "com_OFC_mob_EXEPoN_026_GutsManV2.zip",
        "com_OFC_mob_EXEPoN_026_GutsManV3.zip",
        "com_OFC_mob_EXEPoN_026_GutsManV4.zip"
    ],
    offsetX: 0,offsetY: 50,
}
```

Each key in this JSON is important, and explained below:

- `name` = name you added to encounters.zip.
- `nickname` = name that appears in the Visual Encounters tool.
- `image` = preview image in the dropdown menu
- `package` = name of the virus package 
- `ranks` = if the mod has multiple versions of a virus baked into the mod list them here<br>
   &nbsp; &nbsp; `value` = needs to be the number set in the mods entry.lua<br>
   &nbsp; &nbsp; `name` = display name in dropdown menu.
- `rankImages` = you can assign a seperate image for each virus rank, like each mettaur is a different color. 
- `downloads` = needs to be the name of the ZIP you added to /enemies, each virus can have multiple ZIPs if necessary.
- `offsetX` = horizontal offset for sprite on Visual Encounters preview
- `offsetY` = vertical offset for sprite on Visual Encounters preview

Sprites will only appear in the preview as wide as a single battlefield tile, so some viruses (especially Navis) look smaller than they would appear in-game, it's a limitation of how I designed the preview. You can crop or expand the edges of your sprite to adjust the width and height, then use the offsets to center the sprite on the tile. 





 
