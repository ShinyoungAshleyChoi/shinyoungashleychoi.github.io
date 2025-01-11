document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    const searchResults = document.getElementById("search-results");

    // Fetch the search index
    fetch("/search.json")
        .then((response) => response.json())
        .then((data) => {
            searchInput.addEventListener("input", function () {
                const query = this.value.toLowerCase();
                searchResults.innerHTML = ""; // Clear previous results

                if (query.length > 0) {
                    const filteredPosts = data.filter((post) =>
                        post.title.toLowerCase().includes(query) ||
                        post.content.toLowerCase().includes(query)
                    );

                    if (filteredPosts.length > 0) {
                        filteredPosts.forEach((post) => {
                            const li = document.createElement("li");
                            li.innerHTML = `<a href="${post.url}">${post.title}</a>`;
                            searchResults.appendChild(li);
                        });
                    } else {
                        searchResults.innerHTML = "<li>No results found</li>";
                    }
                }
            });
        });
});