[Skip to main content](https://docs.nano-gpt.com/api-reference/image-generation#content-area)

[NanoGPT API Documentation home page![light logo](https://mintcdn.com/nano-gpt/1yMRHEfiogPQFOKv/logo/light.svg?fit=max&auto=format&n=1yMRHEfiogPQFOKv&q=85&s=bfe91d882f75252f47e89eab1b91f39c)![dark logo](https://mintcdn.com/nano-gpt/1yMRHEfiogPQFOKv/logo/dark.svg?fit=max&auto=format&n=1yMRHEfiogPQFOKv&q=85&s=8ee57975e594b16bd870f211ba556ebd)](https://docs.nano-gpt.com/)

Search...

Ctrl K

Search...

Navigation

API Reference

Image Generation

On this page

- [Overview](https://docs.nano-gpt.com/api-reference/image-generation#overview)
- [OpenAI-Compatible Endpoint (v1/images/generations)](https://docs.nano-gpt.com/api-reference/image-generation#openai-compatible-endpoint-v1%2Fimages%2Fgenerations)
- [Basic Image Generation](https://docs.nano-gpt.com/api-reference/image-generation#basic-image-generation)
- [Image-to-Image with OpenAI Endpoint](https://docs.nano-gpt.com/api-reference/image-generation#image-to-image-with-openai-endpoint)
- [Method 1: Upload from Local File](https://docs.nano-gpt.com/api-reference/image-generation#method-1%3A-upload-from-local-file)
- [Method 2: Upload from Image URL](https://docs.nano-gpt.com/api-reference/image-generation#method-2%3A-upload-from-image-url)
- [Method 3: Multiple Images (for supported models)](https://docs.nano-gpt.com/api-reference/image-generation#method-3%3A-multiple-images-for-supported-models)
- [Supported Image-to-Image Models](https://docs.nano-gpt.com/api-reference/image-generation#supported-image-to-image-models)
- [Image Data URL Format](https://docs.nano-gpt.com/api-reference/image-generation#image-data-url-format)
- [Additional Parameters for Image-to-Image](https://docs.nano-gpt.com/api-reference/image-generation#additional-parameters-for-image-to-image)
- [Image Generation](https://docs.nano-gpt.com/api-reference/image-generation#image-generation)
- [Parameters](https://docs.nano-gpt.com/api-reference/image-generation#parameters)
- [Image-to-Image (img2img) Generation](https://docs.nano-gpt.com/api-reference/image-generation#image-to-image-img2img-generation)
- [Using Image Input](https://docs.nano-gpt.com/api-reference/image-generation#using-image-input)
- [Image Input Parameters](https://docs.nano-gpt.com/api-reference/image-generation#image-input-parameters)
- [Supported Image Formats](https://docs.nano-gpt.com/api-reference/image-generation#supported-image-formats)
- [img2img Example](https://docs.nano-gpt.com/api-reference/image-generation#img2img-example)
- [Best Practices](https://docs.nano-gpt.com/api-reference/image-generation#best-practices)
- [Error Handling](https://docs.nano-gpt.com/api-reference/image-generation#error-handling)

## [​](https://docs.nano-gpt.com/api-reference/image-generation\#overview)  Overview

The NanoGPT API offers access to all the state-of-the-art image models. This guide covers how to use our image generation endpoint.

> **Test note:** Our `bun test` integration suite targets the NanoGPT image endpoint with a 30-second default timeout to accommodate slower generation runs observed in practice.

## [​](https://docs.nano-gpt.com/api-reference/image-generation\#openai-compatible-endpoint-v1%2Fimages%2Fgenerations)  OpenAI-Compatible Endpoint (v1/images/generations)

This endpoint follows the OpenAI specification for image generation and returns a list of base64-encoded images.

### [​](https://docs.nano-gpt.com/api-reference/image-generation\#basic-image-generation)  Basic Image Generation

Copy

```
curl https://nano-gpt.com/v1/images/generations \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "hidream",
    "prompt": "A sunset over a mountain range",
    "n": 1,
    "size": "1024x1024"
  }'

```

### [​](https://docs.nano-gpt.com/api-reference/image-generation\#image-to-image-with-openai-endpoint)  Image-to-Image with OpenAI Endpoint

The OpenAI-compatible endpoint also supports img2img generation using the `imageDataUrl` parameter. Here are the different ways to provide input images:

#### [​](https://docs.nano-gpt.com/api-reference/image-generation\#method-1%3A-upload-from-local-file)  Method 1: Upload from Local File

Copy

```
import requests
import base64

API_KEY = "YOUR_API_KEY"

# Read and encode your input image
with open("input_image.jpg", "rb") as image_file:
    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
    image_data_url = f"data:image/jpeg;base64,{encoded_image}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://nano-gpt.com/v1/images/generations",
    headers=headers,
    json={
        "model": "flux-kontext",
        "prompt": "Transform this image into a watercolor painting",
        "n": 1,
        "size": "1024x1024",
        "imageDataUrl": image_data_url
    }
)

result = response.json()
# The response includes base64-encoded images in result["data"]

```

#### [​](https://docs.nano-gpt.com/api-reference/image-generation\#method-2%3A-upload-from-image-url)  Method 2: Upload from Image URL

Copy

```
import requests
import base64
from urllib.request import urlopen

API_KEY = "YOUR_API_KEY"

# Download and encode image from URL
image_url = "https://example.com/your-image.jpg"
with urlopen(image_url) as response:
    image_data = response.read()
    encoded_image = base64.b64encode(image_data).decode('utf-8')
    # Detect image type from URL or response headers
    image_type = "jpeg"  # or detect from URL/headers
    image_data_url = f"data:image/{image_type};base64,{encoded_image}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://nano-gpt.com/v1/images/generations",
    headers=headers,
    json={
        "model": "flux-kontext",
        "prompt": "Transform this image into a watercolor painting",
        "n": 1,
        "size": "1024x1024",
        "imageDataUrl": image_data_url
    }
)

result = response.json()

```

#### [​](https://docs.nano-gpt.com/api-reference/image-generation\#method-3%3A-multiple-images-for-supported-models)  Method 3: Multiple Images (for supported models)

Some models like `gpt-4o-image`, `flux-kontext`, and `gpt-image-1` support multiple input images:

Copy

```
import requests
import base64

API_KEY = "YOUR_API_KEY"

def image_to_data_url(image_path):
    """Convert image file to base64 data URL"""
    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode('utf-8')
        ext = image_path.lower().split('.')[-1]
        mime_type = "jpeg" if ext == "jpg" else ext
        return f"data:image/{mime_type};base64,{encoded}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Prepare multiple images
image_data_urls = [\
    image_to_data_url("image1.jpg"),\
    image_to_data_url("image2.png"),\
    image_to_data_url("image3.jpg")\
]

response = requests.post(
    "https://nano-gpt.com/v1/images/generations",
    headers=headers,
    json={
        "model": "gpt-4o-image",
        "prompt": "Combine these images into a creative collage",
        "n": 1,
        "size": "1024x1024",
        "imageDataUrls": image_data_urls  # Note: plural form for multiple images
    }
)

result = response.json()

```

#### [​](https://docs.nano-gpt.com/api-reference/image-generation\#supported-image-to-image-models)  Supported Image-to-Image Models

The following models support image input via the OpenAI endpoint:**Single Image Input:**

- `flux-dev-image-to-image` \- Image-to-image only
- `ghiblify` \- Transform images to Studio Ghibli style
- `gemini-flash-edit` \- Edit images with prompts
- `hidream-edit` \- Advanced image editing
- `bagel` \- Both text-to-image and image-to-image
- `SDXL-ArliMix-v1` \- Artistic transformations
- `Upscaler` \- Upscale images to higher resolution

**Multiple Image Input:**

- `flux-kontext` \- Advanced context-aware generation
- `flux-kontext/dev` \- Development version (image-to-image only)
- `gpt-4o-image` \- GPT-4 powered image generation
- `gpt-image-1` \- Advanced multi-image processing

**Special Cases:**

- `flux-lora/inpainting` \- Requires both `imageDataUrl` (base image) and `maskDataUrl` (mask)

#### [​](https://docs.nano-gpt.com/api-reference/image-generation\#image-data-url-format)  Image Data URL Format

All images must be provided as base64-encoded data URLs:

Copy

```
data:image/[format];base64,[base64-encoded-data]

```

Supported formats:

- `image/jpeg` or `image/jpg`
- `image/png`
- `image/webp`
- `image/gif` (first frame only)

#### [​](https://docs.nano-gpt.com/api-reference/image-generation\#additional-parameters-for-image-to-image)  Additional Parameters for Image-to-Image

When using image-to-image models, you can include these additional parameters:

Copy

```
{
  "model": "flux-kontext",
  "prompt": "Transform to cyberpunk style",
  "imageDataUrl": "data:image/jpeg;base64,...",
  "size": "1024x1024",
  "n": 1,

  // Optional parameters (model-specific)
  "strength": 0.8,              // How much to transform (0.0-1.0)
  "guidance_scale": 7.5,        // Prompt adherence
  "num_inference_steps": 30,    // Quality vs speed
  "seed": 42,                   // For reproducible results
  "kontext_max_mode": true      // Enhanced context (flux-kontext only)
}

```

## [​](https://docs.nano-gpt.com/api-reference/image-generation\#image-generation)  Image Generation

Here’s a complete example using the Recraft model and our older API standard:

Copy

```
import requests
import base64

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://nano-gpt.com/api"

headers = {"x-api-key": API_KEY}

response = requests.post(
    f"{BASE_URL}/generate-image",
    headers=headers,
    json={
        "model": "recraft-v3",
        "prompt": "A serene mountain landscape at sunset",
        "width": 1024,
        "height": 1024
    }
)

result = response.json()
b64_data = result["data"][0]["b64_json"]

# Decode and save the image
image_bytes = base64.b64decode(b64_data)
with open("generated_image.png", "wb") as f:
    f.write(image_bytes)

# Display cost information
cost = result.get("cost", "N/A")
payment_source = result.get("paymentSource", "N/A")
remaining_balance = result.get("remainingBalance")

print(f"Image saved as generated_image.png")
print(f"Cost: {cost} {payment_source}")
if remaining_balance is not None:
    print(f"Remaining balance: {remaining_balance} {payment_source}")
else:
    print("Remaining balance: Not available")

```

## [​](https://docs.nano-gpt.com/api-reference/image-generation\#parameters)  Parameters

The image generation API accepts the following parameters:

- `prompt` (string): The text description of the image you want to generate
- `model` (string): The model to use for generation
- `width` (integer): Width of the generated image (default: 1024)
- `height` (integer): Height of the generated image (default: 1024)
- `negative_prompt` (string): Things to avoid in the generated image
- `nImages` (integer): Number of images to generate (default: 1)
- `num_steps` (integer): Number of denoising steps (default: 30)
- `resolution` (string): Output resolution (default: “1024x1024”)
- `sampler_name` (string): Sampling method (default: “DPM++ 2M Karras”)
- `scale` (float): Guidance scale (default: 7.5)

## [​](https://docs.nano-gpt.com/api-reference/image-generation\#image-to-image-img2img-generation)  Image-to-Image (img2img) Generation

You can use existing images as input for image generation with models that support img2img functionality, such as flux-kontext. This allows you to edit or transform existing images based on text prompts.

### [​](https://docs.nano-gpt.com/api-reference/image-generation\#using-image-input)  Using Image Input

To use an image as input, include the `imageDataUrl` parameter with a base64-encoded image:

Copy

```
import requests
import base64

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://nano-gpt.com/api"

# Read and encode your input image
with open("input_image.jpg", "rb") as image_file:
    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

headers = {"x-api-key": API_KEY}

response = requests.post(
    f"{BASE_URL}/generate-image",
    headers=headers,
    json={
        "model": "flux-kontext",
        "prompt": "Edit this image to add a rainbow in the sky",
        "kontext_max_mode": True,
        "imageDataUrl": f"data:image/jpeg;base64,{encoded_image}"
    }
)

result = response.json()

```

### [​](https://docs.nano-gpt.com/api-reference/image-generation\#image-input-parameters)  Image Input Parameters

When using image input, the following additional parameters are available:

- `imageDataUrl` (string): Base64-encoded image data URL (format: `data:image/[type];base64,[data]`)
- `kontext_max_mode` (boolean): When using flux-kontext model, enables maximum context mode for better image understanding

### [​](https://docs.nano-gpt.com/api-reference/image-generation\#supported-image-formats)  Supported Image Formats

The following image formats are supported for input:

- JPEG/JPG ( `data:image/jpeg;base64,`)
- PNG ( `data:image/png;base64,`)
- WebP ( `data:image/webp;base64,`)

### [​](https://docs.nano-gpt.com/api-reference/image-generation\#img2img-example)  img2img Example

Here’s a complete example of editing an existing image:

Copy

```
import requests
import base64
from PIL import Image
import io

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://nano-gpt.com/api"

def image_to_base64(image_path):
    """Convert an image file to base64 data URL"""
    with open(image_path, "rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode('utf-8')
        # Detect image format
        if image_path.lower().endswith('.png'):
            return f"data:image/png;base64,{encoded}"
        elif image_path.lower().endswith('.webp'):
            return f"data:image/webp;base64,{encoded}"
        else:  # Default to JPEG
            return f"data:image/jpeg;base64,{encoded}"

headers = {"x-api-key": API_KEY}

# Convert your input image
image_data_url = image_to_base64("landscape.jpg")

# Edit the image
response = requests.post(
    f"{BASE_URL}/generate-image",
    headers=headers,
    json={
        "model": "flux-kontext",
        "prompt": "Transform this landscape to a winter scene with snow",
        "kontext_max_mode": True,
        "imageDataUrl": image_data_url,
        "width": 1024,
        "height": 1024
    }
)

if response.status_code == 200:
    result = response.json()
    output_b64 = result["data"][0]["b64_json"]

    # Save the edited image
    output_bytes = base64.b64decode(output_b64)
    with open("winter_landscape.png", "wb") as f:
        f.write(output_bytes)

    print("Image edited and saved as winter_landscape.png")
else:
    print(f"Error: {response.status_code} - {response.text}")

```

## [​](https://docs.nano-gpt.com/api-reference/image-generation\#best-practices)  Best Practices

1. **Prompt Engineering**   - Be specific and detailed in your prompts
   - Include style references when needed
   - Use the negative prompt to avoid unwanted elements
   - For img2img, describe the changes you want relative to the input image
2. **Image Quality**   - Higher resolution settings produce better quality but take longer
   - More steps generally mean better quality but slower generation
   - Adjust the guidance scale based on how closely you want to follow the prompt
   - For img2img, ensure your input image has good quality for best results
3. **Cost Optimization**   - Start with lower resolution for testing
   - Use fewer steps during development
   - Generate one image at a time unless multiple variations are needed
   - Compress input images appropriately to reduce upload size

## [​](https://docs.nano-gpt.com/api-reference/image-generation\#error-handling)  Error Handling

The API may return various error codes:

- 400: Bad Request (invalid parameters)
- 401: Unauthorized (invalid API key)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

Always implement proper error handling in your applications:

Copy

```
try:
    result = generate_image(prompt)
except requests.exceptions.RequestException as e:
    if e.response:
        if e.response.status_code == 401:
            print("Invalid API key. Please check your credentials.")
        elif e.response.status_code == 429:
            print("Rate limit exceeded. Please wait before trying again.")
        else:
            print(f"API Error: {e.response.status_code}")
    else:
        print(f"Network Error: {str(e)}")

```

[Embeddings](https://docs.nano-gpt.com/api-reference/embeddings) [Video Generation](https://docs.nano-gpt.com/api-reference/video-generation)

CtrlI

Assistant

Responses are generated using AI and may contain mistakes.
