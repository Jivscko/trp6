#!/usr/bin/env python3
"""Take the 4 entry screenshots: real Playwright chromium renders of the app, no editing.

Progress is seeded through the app's own localStorage persistence format (the same mechanism
the tracker uses), then views are reached by clicking the real UI. First by name = cover.
Run: python3 scripts/shoot.py  (static server on 127.0.0.1:8123 with app/ at root)
"""
import os
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8123"
CHROME = "/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"
OUT = os.path.join(os.path.dirname(__file__), "..", "screenshots")

# A believable mid-playthrough state: opening + chapters 1-4, two named missions,
# the activity tour started, fishing and arcade done. 10 / 55 earned.
EARNED = [2, 3, 4, 5, 6, 8, 9, 16, 20, 21]
SEED = (
    "localStorage.setItem('leonida-legend.progress.v1', JSON.stringify({version:1,earned:{"
    + ",".join(f'"{i}":true' for i in EARNED)
    + "}}));"
)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx.add_init_script(SEED)
    page = ctx.new_page()
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_selector("li.row")

    def shot(name):
        path = os.path.join(OUT, name)
        page.screenshot(path=path, type="jpeg", quality=85)
        print(name, os.path.getsize(path), "bytes")

    # 1 — cover: tracker with a missable story trophy's cited guide open beside the list
    page.locator('li.row[data-id="23"]').click()
    page.wait_for_selector("#detail:not([hidden])")
    page.evaluate("window.scrollTo(0,0)")  # clicking a row scrolls it into view; keep the header in frame
    page.wait_for_timeout(250)
    shot("1-tracker.jpg")
    page.keyboard.press("Escape")

    # 2 — platinum roadmap: stages, missable warnings, point of no return.
    # Taller viewport (1280x1280, within the caps) so stages 1-4 incl. the PONR all fit.
    road = ctx.new_page()
    road.set_viewport_size({"width": 1280, "height": 1280})
    road.goto(BASE + "/", wait_until="networkidle")
    road.wait_for_selector("li.row")
    road.locator("#tab-roadmap").click()
    road.wait_for_timeout(250)
    road.evaluate("window.scrollTo(0,0)")
    path = os.path.join(OUT, "2-roadmap.jpg")
    road.screenshot(path=path, type="jpeg", quality=82)
    print("2-roadmap.jpg", os.path.getsize(path), "bytes")
    road.close()

    # 3 — missable filter + spoiler guard on: unearned story names hidden
    page.locator('#kind-chips .chip[data-kind="missable"]').click()
    page.locator("label.switch").click()
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(250)
    shot("3-spoiler.jpg")
    page.locator("label.switch").click()  # spoiler off again
    page.locator('#kind-chips .chip[data-kind="all"]').click()

    # 4 — collectibles filter with a silver collectible's guide + sources open
    page.locator('#kind-chips .chip[data-kind="collectible"]').click()
    page.wait_for_timeout(150)
    page.locator('li.row[data-id="30"]').click()
    page.wait_for_selector("#detail:not([hidden])")
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(250)
    shot("4-collectibles.jpg")

    browser.close()
print("done")