#!/usr/bin/env python3
"""Offline verification of the Leonida Legend app with Playwright chromium.

Asserts: zero external network requests, 55 trophies render, filters work,
spoiler guard hides story names/descriptions, detail shows cited guide,
export/import round-trips, localStorage persists across reload, roadmap renders.
Run: python3 scripts/verify.py  (expects a static server on 127.0.0.1:8123 with app/ at root)
"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8123"
CHROME = "/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"
results = []


def check(name, ok, extra=""):
    results.append((name, bool(ok), extra))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{extra}]" if extra else ""))


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()

    external = []
    local = []

    def handle(route):
        url = route.request.url
        if url.startswith(BASE + "/") or url == BASE:
            local.append(url)
            route.continue_()
        elif url.startswith("data:") or url.startswith("blob:"):
            local.append(url)
            route.continue_()
        else:
            external.append(url)
            route.abort()

    page.route("**/*", handle)
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_selector("li.row")

    rows = page.locator("li.row").count()
    check("55 trophies render", rows == 55, f"{rows} rows")
    check("no external network requests", len(external) == 0, f"{len(local)} local, {len(external)} external: {external[:3]}")

    # progress + persistence (mark id 2, Just Like Paradise — row index 1)
    page.locator("li.row .check").nth(1).click()
    page.wait_for_function("document.getElementById('progress-count').textContent.startsWith('1 / 55')")
    check("mark earned updates counter", True)
    page.reload(wait_until="networkidle")
    page.wait_for_selector("li.row")
    txt = page.locator("#progress-count").inner_text()
    check("localStorage persists across reload", txt.startswith("1 / 55"), txt)
    gcounts = page.locator("#grade-counts").inner_text()
    check("per-grade counts shown", "0/1" in gcounts and "0/2" in gcounts and "0/6" in gcounts and "1/46" in gcounts, gcounts.replace("\n", " "))

    # filters
    def click_chip(kind):
        page.locator(f'#kind-chips .chip[data-kind="{kind}"]').click()
        page.wait_for_timeout(80)
        return page.locator("li.row").count()

    check("missable filter", click_chip("missable") == 23)
    check("story filter", click_chip("story") == 23)
    check("collectible filter", click_chip("collectible") == 6)
    check("activity filter", click_chip("activity") == 26)
    check("online filter (none in list)", click_chip("online") == 0)
    click_chip("all")
    page.select_option("#grade", "silver")
    page.wait_for_timeout(80)
    check("grade filter silver", page.locator("li.row").count() == 6)
    page.select_option("#grade", "all")
    page.fill("#search", "Bowling")
    page.wait_for_timeout(120)
    check("search by name", page.locator("li.row").count() == 1)
    page.fill("#search", "")
    page.wait_for_timeout(120)

    # spoiler guard: first row (id 1 platinum, kind story, unearned) gets hidden
    page.locator("label.switch").click()
    page.wait_for_timeout(150)
    assert page.locator("#spoiler").is_checked()
    hidden_rows = page.locator("li.row.spoiled").count()
    check("spoiler hides unearned story trophies", hidden_rows == 22, f"{hidden_rows} spoiled (23 story - 1 earned)")
    first_name = page.locator("li.row .t-name").first.inner_text()
    check("spoiled name replaced", first_name == "Hidden story trophy", first_name)
    earned_row_visible = page.locator("li.row.earned .t-name").first.inner_text()
    check("earned story trophy stays visible", earned_row_visible == "Just Like Paradise", earned_row_visible)

    # detail panel with spoiler ON for an unearned story trophy, then OFF
    page.locator("li.row").nth(2).click()
    page.wait_for_selector("#detail:not([hidden])")
    check("detail spoiler lock shown", page.locator(".d-spoiler").count() == 1)
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    page.locator("label.switch").click()
    page.wait_for_timeout(150)
    assert not page.locator("#spoiler").is_checked()
    page.locator("li.row").nth(2).click()
    page.wait_for_timeout(100)
    dtitle = page.locator(".d-title").inner_text()
    check("detail shows official name", dtitle == "Paradise Lost", dtitle)
    check("detail shows official description", "Complete Chapter 1." in page.locator(".d-desc").inner_text())
    check("detail shows cited sources", "PSNProfiles" in page.locator(".d-src").inner_text())
    check("detail shows missable warning", page.locator(".d-warn").count() == 1)
    check("detail shows roadmap stage", "stage 1" in page.locator(".d-meta").inner_text().lower())
    page.locator(".d-earn").click()
    page.wait_for_timeout(120)
    check("detail mark-earned toggle", page.locator("#progress-count").inner_text().startswith("2 / 55"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    check("Escape closes detail", page.locator("#detail").get_attribute("hidden") is not None)

    # export
    with page.expect_download() as dl:
        page.locator("#export").click()
    path = dl.value.path()
    exported = json.load(open(path))
    check("export JSON has earned ids", exported["earned_ids"] == [2, 3], str(exported["earned_ids"]))

    # reset then import round-trip
    page.on("dialog", lambda d: d.accept())
    page.locator("#reset").click()
    page.wait_for_timeout(150)
    check("reset clears progress", page.locator("#progress-count").inner_text().startswith("0 / 55"))
    page.locator("#import").set_input_files(path)
    page.wait_for_timeout(250)
    check("import restores progress", page.locator("#progress-count").inner_text().startswith("2 / 55"),
          page.locator("#progress-count").inner_text())

    # roadmap view
    page.locator("#tab-roadmap").click()
    page.wait_for_timeout(150)
    stages = page.locator("#roadmap section.stage").count()
    check("roadmap has 7 stages", stages == 7, str(stages))
    ponr = page.locator(".roadmap-intro").inner_text()
    check("point of no return called out", "final mission" in ponr)
    check("stage 4 PONR warning", page.locator(".stage-warning.ponr").count() == 1)
    rt = page.locator(".rt").count()
    check("roadmap shows all 55 trophies", rt == 55, str(rt))
    check("roadmap missable chips flagged", page.locator(".rt.missable").count() == 23)

    # back to tracker, final external-request assertion
    page.locator("#tab-tracker").click()
    page.wait_for_timeout(120)
    check("still zero external requests at end", len(external) == 0, str(external[:3]))

    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)