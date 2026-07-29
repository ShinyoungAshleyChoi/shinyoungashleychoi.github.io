document.addEventListener("DOMContentLoaded", function () {
    const navToggle = document.querySelector(".mobile-nav-toggle");
    const sidebarContent = document.querySelector(".sidebar-content");

    if (navToggle && sidebarContent) {
        navToggle.addEventListener("click", function () {
            const open = navToggle.getAttribute("aria-expanded") === "true";
            navToggle.setAttribute("aria-expanded", String(!open));
            sidebarContent.classList.toggle("is-open", !open);
        });
    }

    const postBody = document.getElementById("post-body");
    const toc = document.getElementById("toc");
    const tocToggle = document.querySelector(".toc-toggle");

    if (postBody && toc) {
        const headings = Array.from(postBody.querySelectorAll("h2, h3"));
        headings.forEach(function (heading, index) {
            if (!heading.id) heading.id = "section-" + (index + 1);
            const link = document.createElement("a");
            link.href = "#" + heading.id;
            link.textContent = heading.textContent;
            link.className = "toc__link toc__link--" + heading.tagName.toLowerCase();
            toc.appendChild(link);
        });

        if (!headings.length) {
            toc.innerHTML = '<span class="toc__empty">목차가 없는 글입니다.</span>';
        }
    }

    if (tocToggle && toc) {
        if (window.matchMedia("(max-width: 820px)").matches) {
            tocToggle.setAttribute("aria-expanded", "false");
            toc.classList.add("is-collapsed");
        }

        tocToggle.addEventListener("click", function () {
            const open = tocToggle.getAttribute("aria-expanded") === "true";
            tocToggle.setAttribute("aria-expanded", String(!open));
            toc.classList.toggle("is-collapsed", open);
        });
    }

    document.querySelectorAll(".post-body div.highlighter-rouge, .post-body figure.highlight").forEach(function (block) {
        const code = block.querySelector("code");
        if (!code || block.querySelector(".code-window-title")) return;
        const languageClass = Array.from(code.classList).find(function (name) {
            return name.indexOf("language-") === 0;
        });
        const language = languageClass ? languageClass.replace("language-", "") : "code";
        const title = document.createElement("div");
        title.className = "code-window-title";
        title.innerHTML = '<span>▤ ' + language + '.code</span><span>_ □ ×</span>';
        block.insertBefore(title, block.firstChild);
    });

    const clock = document.getElementById("footer-clock");
    if (clock) {
        const updateClock = function () {
            clock.textContent = new Intl.DateTimeFormat("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }).format(new Date());
        };
        updateClock();
        window.setInterval(updateClock, 60000);
    }
});
