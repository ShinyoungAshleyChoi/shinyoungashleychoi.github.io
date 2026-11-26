const postBody = document.getElementById("post-body");
const toc = document.getElementById("toc");

if (postBody && toc) {
    const headings = postBody.querySelectorAll("h2, h3");
    headings.forEach((heading, index) => {
        if (!heading.id) heading.id = "section-" + (index + 1);
        const item = document.createElement("li");
        item.className = heading.tagName.toLowerCase();
        const link = document.createElement("a");
        link.href = "#" + encodeURIComponent(heading.id);
        link.textContent = heading.textContent;
        item.append(link);
        toc.append(item);
    });
    toc.closest("nav").hidden = headings.length === 0;

    for (const block of postBody.querySelectorAll("pre, table")) {
        block.tabIndex = 0;
    }
}
