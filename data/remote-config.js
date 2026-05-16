const TEXT_PROMPTS_URL = "https://pages.qgming.com/ljprompt/textprompt.json";
const IMAGE_PROMPTS_URL = "https://pages.qgming.com/ljprompt/gptimage.json";
const STAR_IMAGE_PROMPTS_URL = "https://pages.qgming.com/ljprompt/starimage.json";

export const REMOTE_DATA_URLS = {
  textPrompts: [TEXT_PROMPTS_URL],
  imagePrompts: [IMAGE_PROMPTS_URL, STAR_IMAGE_PROMPTS_URL],
};

export const REMOTE_STORAGE_KEYS = {
  textPrompts: "remote_text_prompts_cache_v1",
  imagePrompts: "remote_image_prompts_cache_v1",
};

export const REMOTE_REQUEST_TIMEOUT = 1000 * 60;
