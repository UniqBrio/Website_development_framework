# SAAS IMAGE GENERATION GUIDE — world-class landing page hero, mockup & background imagery
<!-- website_workflow/saas_image_generation_guide.md — added 2026-10-31 from the
     owner's "SaaS world-class website landing page image generation skills".
     It is the GENERAL craft guide (what makes SaaS imagery look premium).
     image_prompts.md stays the BRAND-LOCKED authority: when the two disagree,
     image_prompts.md wins. Read §0 before using the template in §4. -->

## 0. How this fits the framework
Use this guide to DRAFT or improve a prompt. Ship only through image_prompts.md.
1. Fill the template's placeholders from tokens, not by hand:
   [INSERT PLATFORM CONTEXT] → {SITE_NAME} + {ICP} + app_reality.md;
   [INSERT LIGHT/DARK MODE] → {THEME_MODE};
   [INSERT COLOR PALETTE] → image_prompts.md BASE STYLE BLOCK (the generated
   colour tokens, never freehand colours).
2. Append image_prompts.md NEGATIVE RULES to every prompt. Where this guide
   says less, the framework rule applies:
   - Hero depicting the PRODUCT → attach a real screenshot (image_prompts.md
     template 1 and USAGE RULES). "Abstract dashboard" and "dummy data charts"
     are allowed only for decorative or background art. Never present them as
     the product, and never use invented numbers that could be read as claims.
   - "Dark mode UI with neon gradients" stays within the ">30% of frame"
     gradient limit and the two-accent limit.
   - "3D claymorphism avatar" and other generic 3D characters are not
     allowed; only an approved brand character (image_prompts.md §MASCOT) is.
   - "No photorealistic human faces" matches the truth rule. No figure is
     ever presented as a customer.
3. Every render is a candidate. It goes through
   web-illustration-asset-production-pipeline (curation, format, weight
   budget, provenance) before it enters the repo.

---

**Author:** 20-Year SaaS Industry Design Veteran
**Purpose:** A framework for generating ultra-professional, high-converting
SaaS landing page hero images, mockups, and background graphics using AI image
generators (Midjourney, DALL-E 3, Stable Diffusion).

## 1. The Core Philosophy
In SaaS, trust is your highest currency. The imagery on a landing page must
instantly communicate **innovation, reliability, and ease of use**. The design
should feel frictionless. Whether you are building a CRM, a DevOps tool, or a
FinTech platform, the visual language must remain crisp, intentional, and
scalable.

## 2. What MUST Be Present (The "Include" Directives)
When crafting your image generation prompt, ensure you explicitly ask for the
following characteristics:

### A. Layout & Composition
* **Asymmetric or Floating UI:** "Floating dashboard components", "cascading
  UI cards", or "isometric dashboard mockup".
* **Whitespace/Negative Space:** "Generous negative space", "clean background
  suitable for web copy overlay".
* **Perspective:** "Dynamic 3D isometric angle" or "Sleek flat-lay UI
  presentation".

### B. Styling & Aesthetics
* **Modern UI Trends:** "Glassmorphism", "subtle drop shadows", "rounded
  corners (border-radius)", "bento box layout".
* **Lighting:** "Soft studio lighting", "subtle volumetric glow", "rim
  lighting on UI edges".
* **Colors (Tailor to your context later):** Ask for "SaaS color palette",
  "monochromatic with vibrant accent colors", "dark mode UI with neon
  gradients", or "clean light mode with pastel backgrounds". (In this
  framework: the colour tokens, see §0.)

### C. Abstraction over Specifics
* Since AI struggles with exact text, prompt for: "abstract data
  visualization", "minimalist wireframe text blocks", "dummy data charts",
  "glowing nodes and connection lines".
* Include core SaaS symbols (based on your niche): "analytics dashboards",
  "kanban boards", "code snippets in dark IDE boxes", "growth charts".

## 3. What MUST Be Ignored (The Negative Prompts / "Avoid" List)
To ensure the output remains professional and usable, instruct the LLM to
completely avoid the following:

* **Readable Text:** AI generates garbled text that ruins the professional
  illusion. Avoid prompts that ask for specific words on the screen.
  **(Negative prompt: text, typography, letters, watermarks, signatures)**
* **Human Faces (Unless Hyper-Specific):** Generic AI stock-photo faces look
  cheap. Stick to product UI, abstract geometry, or 3D character
  illustrations (e.g., "3D claymorphism avatar") rather than photorealistic
  humans (in this framework, an approved brand character only, see §0). **(Negative prompt: real people,
  creepy faces, stock photography)**
* **Clutter:** SaaS is about solving chaos, not creating it. **(Negative
  prompt: messy, cluttered, complex background, noisy details,
  over-decorated)**
* **Dated Design Trends:** **(Negative prompt: skeuomorphism, heavy bevels,
  web 2.0 gloss, 90s internet, grunge, distressed textures)**
* **Distracting Backgrounds:** The background should support the product,
  not compete with it. **(Negative prompt: busy background, high contrast
  background, distracting scenery)**

## 4. The Master Prompt Template
*Copy and paste this into your LLM once you have your specific website and
platform context (filled per §0).*

> **System Role:** Act as a world-class SaaS web designer and Midjourney prompt engineer.
>
> **Context:** I am designing a landing page for [INSERT PLATFORM CONTEXT HERE - e.g., an AI-driven HR management platform].
>
> **Task:** Generate a highly descriptive image generation prompt for the hero section image.
>
> **Mandatory Elements to Include:**
> * Style: Modern, ultra-professional SaaS aesthetic, clean, frictionless.
> * Visuals: Floating UI cards, abstract dashboard elements, [INSERT SPECIFIC ELEMENTS - e.g., candidate pipeline charts, soft 3D avatars].
> * Layout: Asymmetric composition with ample negative space on the left for website copy.
> * Lighting/Color: Soft studio lighting, [INSERT LIGHT/DARK MODE], [INSERT COLOR PALETTE - e.g., deep navy background with vibrant teal and purple accents].
> * Technique: 8k resolution, UI/UX design, dribbble winner, sleek presentation.
>
> **Strict Elements to Exclude (Negative Prompts):**
> * No realistic text or readable typography (use abstract lines/blocks).
> * No cluttered backgrounds or noisy details.
> * No photorealistic human faces.
> * No dated design trends (skeuomorphism, grunge).
>
> Please output ONLY the finalized image generation prompt based on these rules.
