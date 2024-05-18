function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnTwitter() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(document.title);
  const shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnLinkedIn() {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  const shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareOnWhatsApp() {
  const url = encodeURIComponent(window.location.href);
  const shareUrl = `https://wa.me/?text=${url}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}
