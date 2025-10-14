import asyncio
import base64
from pathlib import Path
from app.config import settings
from app.providers.nano_gpt import NanoGPTProvider

USER_IMAGE_URL = "https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg"
COSTUME_IMAGE_URL = "https://f004.backblazeb2.com/file/waifu-test/waifu-test/costumes/daisy-01.png"
OUTPUT_PATH = Path("nano_gpt_tryon_preview.png")

async def main():
    settings.TEST_MODE = False
    provider = NanoGPTProvider(api_key=settings.NANO_GPT_API_KEY, base_url=settings.NANO_GPT_BASE_URL)
    result = await provider.generate_try_on(
        user_image_base64=USER_IMAGE_URL,
        costume_metadata={"prompt": "Fashion editorial portrait of the provided person wearing the daisy costume",
                        "reference_image_url": COSTUME_IMAGE_URL}
    )
    image_b64 = result.get("image_base64")
    if image_b64:
        OUTPUT_PATH.write_bytes(base64.b64decode(image_b64))
        print(f"Wrote {OUTPUT_PATH.resolve()}")

asyncio.run(main())
