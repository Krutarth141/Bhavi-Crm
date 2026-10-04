// Reference-counted body scroll lock shared by the mobile sidebar drawer and
// every modal, so two things locking at once (e.g. a modal opened from inside
// the sidebar) don't stomp each other's unlock.
//
// Plain overflow:hidden on body isn't reliable enough on mobile — iOS Safari
// especially can still rubber-band/touch-scroll the page behind a fixed
// overlay even with it set. The robust fix is to pull body itself out of
// document flow (position:fixed) while locked, then restore its exact
// scroll position when the last lock releases.
let count = 0;
let scrollY = 0;

const applyLock = () => {
    scrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
};

const removeLock = () => {
    const body = document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    window.scrollTo(0, scrollY);
};

export const acquireScrollLock = () => {
    count += 1;
    if (count === 1) applyLock();
};

export const releaseScrollLock = () => {
    count = Math.max(0, count - 1);
    if (count === 0) removeLock();
};
