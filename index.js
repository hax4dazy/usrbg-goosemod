import * as Patcher from "@goosemod/patcher";
import * as Webpack from "@goosemod/webpack";
import { createItem, removeItem } from "@goosemod/settings";

let settings = {
  API_URL:
    "https://raw.githubusercontent.com/Discord-Custom-Covers/usrbg/master/dist/usrbg.json",
  PRIORITIZE_NITRO_BACKGROUNDS: true,
};

const PLACEHOLDER_NAME = "USRBG_PLACEHOLDER";
const CACHE_SET = new Set();

const getUser = Webpack.findByProps("getUser");
const getUsers = Webpack.findByProps("getUsers").getUsers;
const AssetsUtils = Webpack.findByProps("getUserBannerURL");

let unpatchUsers;
let unpatchBanners;

export default {
  goosemodHandlers: {
    onLoadingFinished: () => {
      createItem("UserBackgrounds", [
        "0.0.1",

        {
          type: "header",
          text: "User Background API URL (Don't change this unless you know what you're doing!)",
        },
        {
          type: "text-input",
          text: "API URL",
          initialValue: () => settings.API_URL,
          oninput: (value, element) => {
            settings.API_URL = value;
          },
        },
        {
          type: "toggle",
          text: "Prioritize Nitro backgrounds",
          subtext:
            "Whether or not to display Nitro backgrounds even if the user has a USRBG background.",
          onToggle: (c) => {
            settings.PRIORITIZE_NITRO_BACKGROUNDS = c;
          },
          isToggled: () => settings.PRIORITIZE_NITRO_BACKGROUNDS,
        },
      ]);
    },
    getSettings: () => [settings],
    onImport: async () => {
      const BG_LIST = await (await fetch(settings.API_URL)).json();
      unpatchUsers = Patcher.patch(getUser, "getUser", (_, res) => {
        try {
          if (BG_LIST[res.id]) {
            if (res.banner || !settings.PRIORITIZE_NITRO_BACKGROUNDS) {
              return res;
            }

            CACHE_SET.add(res.id);
            res.banner = PLACEHOLDER_NAME;

            return res;
          }
        } catch {
          // No fucking clue why it errors so much, but this isn't *really* an issue since I can just catch it when it does happen
          return res;
        }

        return res;
      });

      unpatchBanners = Patcher.patch(
        AssetsUtils,
        "getUserBannerURL",
        (args, res) => {
          if (args[0]["banner"] == PLACEHOLDER_NAME) {
            return BG_LIST[args[0]["id"]]["background"];
          } else {
            return res;
          }
        }
      );
    },
    onRemove: () => {
      removeItem("UserBackgrounds");

      unpatchUsers();
      unpatchBanners();

      const cachedUsers = getUsers();

      for (const id of CACHE_SET) {
        if (cachedUsers[id].banner == PLACEHOLDER_NAME) {
          cachedUsers[id].banner = null;
        }
      }
    },
  },
};
