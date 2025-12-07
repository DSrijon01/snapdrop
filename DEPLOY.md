# SnapDrop Deployment Guide (GitHub Pages)

This guide explains how to deploy your SnapDrop dApp to GitHub Pages for free.

## Prerequisites
- A GitHub account.
- Git installed on your computer.

## Step 1: Prepare the Code
I have already updated your `next.config.ts`:
- `output: 'export'` (Enables static HTML generation)
- `images: { unoptimized: true }` (Required for valid image handling)

## Step 2: Push to GitHub
1.  **Create a new Repository** on GitHub (e.g., named `snapdrop`).
2.  **Push your code**:
    ```bash
    cd snapdrop
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/<your-username>/snapdrop.git
    git push -u origin main
    ```

## Step 3: Deployment
We will use GitHub Actions (easiest way).

1.  Go to your Repository on GitHub.
2.  Click **Settings** > **Pages** (sidebar).
3.  Under **Build and deployment**, select **GitHub Actions** as the source.
4.  It might suggest a "Next.js" workflow. Click **Configure**.
    - If it doesn't auto-suggest, create a file `.github/workflows/nextjs.yml` with the default Next.js template provided by GitHub.
5.  Click **Commit changes**.

GitHub will now automatically build your site and deploy it.

## Step 4: Verify
Once the Action finishes (check the **Actions** tab), your site will be live at:
`https://<your-username>.github.io/snapdrop`

## Important Note on Routing
If you deploy to a sub-path (like `/snapdrop`), you might need to add `basePath: '/snapdrop'` to `next.config.ts`.
If you deploy to `<username>.github.io` (root domain), the current config is perfect.
