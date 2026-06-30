const handle = document.getElementById('zipperHandle');
const leftTitle = document.getElementById('leftTitle');
const rightTitle = document.getElementById('rightTitle');
const leftTeethContainer = document.getElementById('leftTeethContainer');
const rightTeethContainer = document.getElementById('rightTeethContainer');
const stage = document.querySelector('.zipper-stage');
const leftSideTitle = document.querySelector('.left-side-title');
const rightSideTitle = document.querySelector('.right-side-title');
const dragHint = document.getElementById('dragHint');

const teethCount = 60;
for (let i = 0; i < teethCount; i++) {
    const yPos = ((i + 0.5) / teethCount) * 100;

    const lt = document.createElement('div');
    lt.className = 'tooth left-tooth';
    lt.style.top = `${yPos}%`;
    lt.dataset.y = yPos;

    const rt = document.createElement('div');
    rt.className = 'tooth right-tooth';
    rt.style.top = `${yPos}%`;
    rt.dataset.y = yPos;

    leftTeethContainer.appendChild(lt);
    rightTeethContainer.appendChild(rt);
}

const allLeftTeeth = leftTeethContainer.querySelectorAll('.left-tooth');
const allRightTeeth = rightTeethContainer.querySelectorAll('.right-tooth');

let isDragging = false;
let openedOnce = false;
let archiveOpen = false;

const REVEAL_RATIO = 0.22;
const getRevealStart = () => window.innerHeight * REVEAL_RATIO;

const updateHint = (clampedTop) => {
    if (!dragHint || archiveOpen) return;

    if (!openedOnce) {
        dragHint.textContent = '↑ 向上拖拽拉链头，闭合标题';
    } else if (clampedTop > getRevealStart()) {
        dragHint.textContent = '↓ 松手进入档案阅读';
    } else {
        dragHint.textContent = '↓ 继续下拉，松手进入档案';
    }
};

const enterArchive = () => {
    if (archiveOpen) return;

    archiveOpen = true;
    stage.classList.add('archive-open', 'cover-parted');
    stage.classList.remove('is-dragging');

    if (contentInner) {
        contentInner.scrollTop = 0;
    }

    setActiveTimeline('welcome');
    sections.forEach((section) => section.classList.remove('in-view'));
    document.getElementById('welcome')?.classList.add('in-view');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            updateActiveSection();
            layoutSideFiles();
        });
    });
};

const updateUI = (newTop) => {
    if (archiveOpen) return;

    const screenHeight = window.innerHeight;
    const handleHeight = 90;

    const clampedTop = Math.max(0, Math.min(newTop, screenHeight - handleHeight));
    handle.style.top = `${clampedTop}px`;

    const progress = 1 - (clampedTop / (screenHeight - handleHeight));
    const topThreshold = 20;
    const revealStart = getRevealStart();
    const partedPreview = openedOnce && clampedTop > revealStart;

    if (!openedOnce && clampedTop <= topThreshold) {
        openedOnce = true;
    }

    if (partedPreview) {
        stage.classList.add('cover-parted');
    } else {
        stage.classList.remove('cover-parted');
    }

    if (!partedPreview) {
        if (!openedOnce) {
            const ease = Math.pow(progress, 0.7);
            const moveX = 90 * (1 - ease);
            const moveY = 40 * (1 - ease);
            const rotate = 6 * (1 - ease);
            const scale = 0.72 + 0.28 * ease;
            const opacity = Math.min(1, progress * 1.4);

            leftTitle.style.transform = `translate(${-moveX}px, ${moveY}px) rotate(${-rotate}deg) scale(${scale})`;
            rightTitle.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${rotate}deg) scale(${scale})`;
            leftTitle.style.opacity = opacity;
            rightTitle.style.opacity = opacity;
        } else {
            leftTitle.style.transform = 'translate(0, 0) scale(1)';
            rightTitle.style.transform = 'translate(0, 0) scale(1)';
            leftTitle.style.opacity = 1;
            rightTitle.style.opacity = 1;
        }
    } else {
        leftTitle.style.transform = 'translate(0, 0) scale(1)';
        rightTitle.style.transform = 'translate(0, 0) scale(1)';
        leftTitle.style.opacity = 1;
        rightTitle.style.opacity = 1;
    }

    leftSideTitle.style.transform = 'translateY(-50%)';
    rightSideTitle.style.transform = 'translateY(-50%)';

    updateHint(clampedTop);

    const handleClosePercent = ((clampedTop + handleHeight * 0.72) / screenHeight) * 100;
    const allTeethClosed = clampedTop <= topThreshold + 2;

    const setToothState = (tooth, side) => {
        const toothY = parseFloat(tooth.dataset.y);
        const closed = allTeethClosed || toothY >= handleClosePercent;

        if (closed) {
            tooth.style.transform = side === 'left'
                ? 'translateX(12px) rotate(0deg)'
                : 'translateX(-12px) rotate(0deg)';
        } else {
            tooth.style.transform = side === 'left'
                ? 'translateX(-40px) rotate(-35deg)'
                : 'translateX(40px) rotate(35deg)';
        }
    };

    allLeftTeeth.forEach((tooth) => setToothState(tooth, 'left'));
    allRightTeeth.forEach((tooth) => setToothState(tooth, 'right'));
};

const tryEnterArchive = () => {
    if (archiveOpen || !openedOnce) return;

    const clampedTop = parseFloat(handle.style.top) || 0;
    if (clampedTop > getRevealStart()) {
        enterArchive();
    }
};

const startDrag = () => {
    if (archiveOpen) return;
    isDragging = true;
    stage.classList.add('is-dragging');
};

const endDrag = () => {
    if (!isDragging) return;

    isDragging = false;
    stage.classList.remove('is-dragging');
    tryEnterArchive();
};

const onMove = (clientY) => {
    if (!isDragging || archiveOpen) return;
    updateUI(clientY - 45);
};

handle.addEventListener('mousedown', startDrag);
window.addEventListener('mouseup', endDrag);
window.addEventListener('mousemove', (e) => onMove(e.clientY));

handle.addEventListener('touchstart', (e) => {
    if (archiveOpen) return;
    e.preventDefault();
    isDragging = true;
    stage.classList.add('is-dragging');
}, { passive: false });

window.addEventListener('touchend', endDrag);
window.addEventListener('touchmove', (e) => {
    if (!isDragging || archiveOpen) return;
    onMove(e.touches[0].clientY);
}, { passive: true });

stage.addEventListener('selectstart', (e) => {
    if (!archiveOpen) e.preventDefault();
});

/* ── 时间轴导航 & 滚动高亮 ── */

const sections = document.querySelectorAll('.report-section');
const timelineBtns = document.querySelectorAll('.timeline__btn');
const contentInner = document.getElementById('contentInner');
const progressFill = document.getElementById('progressFill');
const progressSlider = document.getElementById('progressSlider');

const updateScrollProgress = () => {
    if (!archiveOpen || !contentInner || !progressFill) return;
    const { scrollTop, scrollHeight, clientHeight } = contentInner;
    const max = scrollHeight - clientHeight;
    const ratio = max > 0 ? scrollTop / max : 0;
    const pct = `${ratio * 100}%`;
    progressFill.style.height = pct;
    if (progressSlider) progressSlider.style.bottom = pct;
};

const setActiveTimeline = (id) => {
    timelineBtns.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.target === id);
    });
};

timelineBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        if (!archiveOpen) return;

        const target = document.getElementById(btn.dataset.target);
        if (target && contentInner) {
            contentInner.scrollTo({
                top: target.offsetTop - contentInner.offsetTop - 16,
                behavior: 'smooth',
            });
        }
    });
});

/** 阅读焦点线：章节高亮与时间轴（前言等短章更及时） */
const updateActiveSection = () => {
    if (!archiveOpen || !contentInner) return;

    const readY = contentInner.scrollTop + contentInner.clientHeight * 0.26;
    let active = sections[0];

    sections.forEach((section) => {
        const top = section.offsetTop - contentInner.offsetTop;
        if (readY >= top - 32) active = section;
    });

    sections.forEach((section) => {
        section.classList.toggle('in-view', section === active);
    });
    setActiveTimeline(active.id);
};

/* ── 两侧参考档案：定位与交互 ── */

const contentPanel = document.getElementById('contentPanel');
const sideFiles = document.querySelectorAll('.side-file');
const sectionsContainer = document.querySelector('.sections-container');
const WING_PAD_TOP = 100;
const WING_PAD_BOTTOM = 48;
const FILE_MIN_GAP = 20;
const CONTENT_GAP = 32;
const READ_LINE_RATIO = 0.36;

const getAnchorScrollBounds = (anchorEl) => {
    const cRect = contentInner.getBoundingClientRect();
    const aRect = anchorEl.getBoundingClientRect();
    const top = aRect.top - cRect.top + contentInner.scrollTop;
    const height = Math.max(anchorEl.offsetHeight, 40);
    return { top, bottom: top + height, height };
};

/** 配图随段落出现/消失：提前进入、延后退出，拉长停留 */
const isAnchorActiveForFile = (anchorEl) => {
    if (!contentInner || !anchorEl) return false;

    const viewH = contentInner.clientHeight;
    const { top, bottom } = getAnchorScrollBounds(anchorEl);
    const readY = contentInner.scrollTop + viewH * READ_LINE_RATIO;

    const enterEarly = viewH * 0.38;
    const exitLate = viewH * 0.42;

    return readY >= top - enterEarly && readY <= bottom + exitLate;
};

const resolveSideCollisions = (items, minCenter, maxCenter) => {
    if (!items.length) return;

    items.sort((a, b) => a.top - b.top);

    for (let i = 1; i < items.length; i += 1) {
        const prev = items[i - 1];
        const curr = items[i];
        const minTop = prev.top + (prev.height + curr.height) / 2 + FILE_MIN_GAP;
        if (curr.top < minTop) curr.top = minTop;
    }

    for (let i = items.length - 1; i >= 0; i -= 1) {
        const curr = items[i];
        const maxTop = maxCenter - curr.height / 2;
        if (curr.top > maxTop) curr.top = maxTop;
    }

    for (let i = 1; i < items.length; i += 1) {
        const prev = items[i - 1];
        const curr = items[i];
        const minTop = prev.top + (prev.height + curr.height) / 2 + FILE_MIN_GAP;
        if (curr.top < minTop) curr.top = minTop;
    }

    for (let i = 0; i < items.length; i += 1) {
        const curr = items[i];
        const minTop = minCenter + curr.height / 2;
        if (curr.top < minTop) curr.top = minTop;
    }

    for (let i = 1; i < items.length; i += 1) {
        const prev = items[i - 1];
        const curr = items[i];
        const minTop = prev.top + (prev.height + curr.height) / 2 + FILE_MIN_GAP;
        if (curr.top < minTop) curr.top = minTop;
    }
};

const layoutSideFiles = () => {
    if (!archiveOpen) return;

    const placements = { left: [], right: [] };
    const colRect = sectionsContainer?.getBoundingClientRect()
        ?? contentInner?.getBoundingClientRect();

    sideFiles.forEach((file) => {
        const anchorEl = document.getElementById(file.dataset.anchor);
        if (!anchorEl) return;

        const active = isAnchorActiveForFile(anchorEl);
        file.classList.toggle('is-near', active);
        file.classList.toggle('is-away', !active);

        if (!active) return;

        const aRect = anchorEl.getBoundingClientRect();
        const anchorY = aRect.top + aRect.height * 0.42;
        const side = file.dataset.side;

        placements[side].push({
            file,
            top: anchorY,
            height: file.offsetHeight || (file.classList.contains('side-file--stack') ? 300 : 280),
        });
    });

    ['left', 'right'].forEach((side) => {
        const items = placements[side];
        items.forEach((item) => {
            item.height = item.file.offsetHeight || 280;
        });
        resolveSideCollisions(items, WING_PAD_TOP, window.innerHeight - WING_PAD_BOTTOM);

        items.forEach((item) => {
            const cardWidth = item.file.offsetWidth || 200;
            item.file.style.top = `${item.top}px`;

            if (!colRect) return;

            if (side === 'left') {
                const minLeft = 76;
                const leftPos = Math.max(minLeft, colRect.left - cardWidth - CONTENT_GAP);
                item.file.style.left = `${leftPos}px`;
                item.file.style.right = 'auto';
            } else {
                const leftPos = colRect.right + CONTENT_GAP;
                const maxLeft = window.innerWidth - cardWidth - 20;
                item.file.style.left = `${Math.min(leftPos, maxLeft)}px`;
                item.file.style.right = 'auto';
            }
        });
    });
};

sideFiles.forEach((file) => {
    file.addEventListener('mouseenter', () => {
        sideFiles.forEach((f) => f.classList.remove('is-active'));
        file.classList.add('is-active');
        contentPanel?.classList.add('side-focus');
    });

    file.addEventListener('mouseleave', () => {
        file.classList.remove('is-active');
        const anyActive = [...sideFiles].some((f) => f.matches(':hover'));
        if (!anyActive) contentPanel?.classList.remove('side-focus');
    });
});

/* ── 证物放大查阅 ── */

const exhibitLightbox = document.getElementById('exhibitLightbox');
const lightboxImgWrap = document.getElementById('lightboxImgWrap');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxStack = document.getElementById('lightboxStack');
const lightboxTag = document.getElementById('lightboxTag');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxBackdrop = document.getElementById('lightboxBackdrop');

const openExhibitLightbox = (file) => {
    if (!exhibitLightbox) return;

    const stack = file.querySelector('.side-file-stack');

    if (stack && lightboxStack && lightboxImg) {
        lightboxStack.innerHTML = '';
        stack.querySelectorAll('.side-file-stack__item').forEach((item) => {
            const srcImg = item.querySelector('img');
            const label = item.querySelector('.side-file-stack__label');
            if (!srcImg) return;

            const layer = document.createElement('figure');
            layer.className = 'exhibit-lightbox__stack-item';

            const img = document.createElement('img');
            img.src = srcImg.currentSrc || srcImg.src;
            img.alt = srcImg.alt;
            layer.appendChild(img);

            if (label) {
                const cap = document.createElement('span');
                cap.textContent = label.textContent;
                layer.appendChild(cap);
            }

            lightboxStack.appendChild(layer);
        });

        lightboxImg.hidden = true;
        lightboxImg.removeAttribute('src');
        lightboxStack.hidden = false;
        lightboxImgWrap?.classList.add('exhibit-lightbox__img-wrap--stack');
    } else {
        const img = file.querySelector(':scope > img');
        if (!img || !lightboxImg) return;

        lightboxStack && (lightboxStack.hidden = true);
        lightboxStack && (lightboxStack.innerHTML = '');
        lightboxImgWrap?.classList.remove('exhibit-lightbox__img-wrap--stack');
        lightboxImg.hidden = false;
        lightboxImg.src = img.currentSrc || img.src;
        lightboxImg.alt = img.alt;
    }

    if (lightboxTag) {
        lightboxTag.textContent = file.querySelector('.side-file__tag')?.textContent ?? '';
    }
    if (lightboxCaption) {
        lightboxCaption.textContent = file.querySelector('figcaption')?.textContent ?? '';
    }

    exhibitLightbox.classList.add('is-open');
    exhibitLightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    lightboxClose?.focus();
};

const closeExhibitLightbox = () => {
    if (!exhibitLightbox) return;

    exhibitLightbox.classList.remove('is-open');
    exhibitLightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (lightboxImg) {
        lightboxImg.hidden = false;
        lightboxImg.removeAttribute('src');
    }
    if (lightboxStack) {
        lightboxStack.hidden = true;
        lightboxStack.innerHTML = '';
    }
    lightboxImgWrap?.classList.remove('exhibit-lightbox__img-wrap--stack');
};

sideFiles.forEach((file) => {
    file.addEventListener('click', (e) => {
        if (!archiveOpen) return;
        e.preventDefault();
        openExhibitLightbox(file);
    });
});

lightboxClose?.addEventListener('click', closeExhibitLightbox);
lightboxBackdrop?.addEventListener('click', closeExhibitLightbox);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && exhibitLightbox?.classList.contains('is-open')) {
        closeExhibitLightbox();
    }
});

if (contentInner) {
    contentInner.addEventListener('scroll', () => {
        updateScrollProgress();
        updateActiveSection();
        layoutSideFiles();
    }, { passive: true });
}

window.addEventListener('resize', layoutSideFiles);

sideFiles.forEach((file) => {
    file.querySelectorAll('img').forEach((img) => {
        img.addEventListener('load', layoutSideFiles, { passive: true });
    });
});

/* ── 前言：纽扣 vs 拉链对比体验 ── */

(() => {
    const demo = document.getElementById('closureDemo');
    const buttonRows = document.getElementById('buttonRows');
    const buttonPlacket = document.getElementById('buttonPlacket');
    const buttonStat = document.getElementById('buttonStat');
    const buttonHint = document.getElementById('buttonHint');
    const buttonPanel = demo?.querySelector('.closure-demo__panel--buttons');
    const zipperPanel = demo?.querySelector('.closure-demo__panel--zipper');
    const miniZipper = document.getElementById('miniZipper');
    const miniZipperHandle = document.getElementById('miniZipperHandle');
    const miniTeethLeft = document.getElementById('miniTeethLeft');
    const miniTeethRight = document.getElementById('miniTeethRight');
    const zipperStat = document.getElementById('zipperStat');
    const zipperHint = document.getElementById('zipperHint');
    const resetBtn = document.getElementById('closureDemoReset');

    if (!demo || !buttonRows || !miniZipper || !miniZipperHandle) return;

    const BUTTON_COUNT = 5;
    const SNAP_PX = 52;
    const MINI_TOOTH_COUNT = 26;

    let buttonStartTime = null;
    let buttonOps = 0;
    let fastenedCount = 0;
    let buttonTimerId = null;
    let dragState = null;
    let zipperDone = false;
    let zipperFinished = false;
    let zipperFinishTimer = null;

    const onDocPointerMove = (e) => {
        if (!dragState) return;
        e.preventDefault();

        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        dragState.btn.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const finishButtonDrag = (e) => {
        if (!dragState) return;

        document.removeEventListener('pointermove', onDocPointerMove);
        document.removeEventListener('pointerup', finishButtonDrag);
        document.removeEventListener('pointercancel', finishButtonDrag);
        buttonPlacket.classList.remove('is-dragging');

        const btn = dragState.btn;
        btn.classList.remove('is-dragging');
        btn.releasePointerCapture?.(dragState.pointerId);

        const row = btn.parentElement;
        const eye = row?.querySelector('.btn-eye');

        if (eye) {
            const btnRect = btn.getBoundingClientRect();
            const eyeRect = eye.getBoundingClientRect();
            const dx = (btnRect.left + btnRect.width / 2) - (eyeRect.left + eyeRect.width / 2);
            const dy = (btnRect.top + btnRect.height / 2) - (eyeRect.top + eyeRect.height / 2);

            if (Math.hypot(dx, dy) < SNAP_PX) {
                snapButton(btn);
                buttonOps += 1;
                fastenedCount += 1;
                if (buttonStartTime) {
                    buttonStat.textContent = formatStat((performance.now() - buttonStartTime) / 1000, buttonOps);
                }
                if (fastenedCount === BUTTON_COUNT) {
                    stopButtonTimer();
                    buttonPanel?.classList.add('is-done');
                    buttonHint.textContent = `${BUTTON_COUNT} 颗纽扣，${buttonOps} 次拖拽定位`;
                }
                dragState = null;
                return;
            }
        }

        resetButtonHome(btn);
        dragState = null;
    };

    const formatStat = (elapsed, ops) => `耗时 ${elapsed.toFixed(1)}s · 操作 ${ops} 次`;

    const startButtonTimer = () => {
        if (buttonTimerId) return;
        buttonTimerId = window.setInterval(() => {
            if (!buttonStartTime) return;
            buttonStat.textContent = formatStat((performance.now() - buttonStartTime) / 1000, buttonOps);
        }, 100);
    };

    const stopButtonTimer = () => {
        if (buttonTimerId) {
            clearInterval(buttonTimerId);
            buttonTimerId = null;
        }
    };

    const buildButtons = () => {
        buttonRows.innerHTML = '';
        for (let i = 0; i < BUTTON_COUNT; i += 1) {
            const pct = 11 + (i / (BUTTON_COUNT - 1)) * 78;
            const row = document.createElement('div');
            row.className = 'button-placket__row';
            row.style.top = `${pct}%`;

            const btn = document.createElement('div');
            btn.className = 'btn-fastener';
            btn.dataset.index = String(i);
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-label', `第 ${i + 1} 颗纽扣`);

            const eye = document.createElement('div');
            eye.className = 'btn-eye';
            eye.dataset.index = String(i);

            row.append(btn, eye);
            buttonRows.appendChild(row);

            btn.addEventListener('pointerdown', onButtonPointerDown);
        }
    };

    const buildMiniTeeth = () => {
        miniTeethLeft.innerHTML = '';
        miniTeethRight.innerHTML = '';
        for (let i = 0; i < MINI_TOOTH_COUNT; i += 1) {
            const pct = (i / (MINI_TOOTH_COUNT - 1)) * 96 + 2;
            const lt = document.createElement('div');
            lt.className = 'mini-zipper__tooth';
            lt.style.top = `${pct}%`;
            lt.dataset.index = String(i);
            const rt = lt.cloneNode(true);
            miniTeethLeft.appendChild(lt);
            miniTeethRight.appendChild(rt);
        }
    };

    const resetButtonHome = (btn) => {
        btn.classList.remove('is-dragging', 'is-fastened');
        btn.style.transform = '';
        btn.style.left = '18%';
        btn.style.top = '50%';
        btn.style.right = 'auto';
        btn.style.marginLeft = '-11px';
        btn.style.marginTop = '-11px';
    };

    const snapButton = (btn) => {
        const row = btn.parentElement;
        const eye = row?.querySelector('.btn-eye');
        btn.classList.remove('is-dragging');
        btn.classList.add('is-fastened');
        btn.style.left = 'auto';
        btn.style.right = '16%';
        btn.style.top = '50%';
        btn.style.marginLeft = '0';
        btn.style.marginTop = '-11px';
        btn.style.transform = 'none';
        eye?.classList.add('is-filled');
    };

    const onButtonPointerDown = (e) => {
        const btn = e.currentTarget;
        if (btn.classList.contains('is-fastened')) return;

        e.preventDefault();
        e.stopPropagation();
        btn.setPointerCapture(e.pointerId);
        btn.classList.add('is-dragging');
        buttonPlacket.classList.add('is-dragging');

        if (buttonStartTime === null) {
            buttonStartTime = performance.now();
            startButtonTimer();
        }

        dragState = {
            btn,
            startX: e.clientX,
            startY: e.clientY,
            pointerId: e.pointerId,
        };

        document.addEventListener('pointermove', onDocPointerMove, { passive: false });
        document.addEventListener('pointerup', finishButtonDrag);
        document.addEventListener('pointercancel', finishButtonDrag);
    };

    const closeMiniTeethUpTo = (ratio) => {
        const threshold = ratio * 100;
        miniZipper.querySelectorAll('.mini-zipper__tooth').forEach((tooth) => {
            const top = parseFloat(tooth.style.top);
            tooth.style.opacity = top <= threshold + 4 ? '1' : '0.45';
        });
    };

    const finishMiniZipper = (t0) => {
        if (zipperFinished) return;
        zipperFinished = true;
        closeMiniTeethUpTo(1);
        const elapsed = (performance.now() - t0) / 1000;
        zipperStat.textContent = formatStat(elapsed, 1);
        zipperPanel?.classList.add('is-done');
        zipperHint.textContent = '一次滑动，全部咬合';
        miniZipper.classList.remove('is-busy');
    };

    const runMiniZipper = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (zipperDone || miniZipper.classList.contains('is-closed')) return;

        zipperDone = true;
        miniZipper.classList.add('is-closed', 'is-busy');
        const t0 = performance.now();
        zipperHint.textContent = '拉头下滑中…';

        const tick = () => {
            if (!miniZipper.classList.contains('is-closed')) return;
            const handleTop = parseFloat(getComputedStyle(miniZipperHandle).top);
            const trackH = miniZipper.clientHeight;
            const ratio = Math.min(1, Math.max(0, (handleTop - 6) / (trackH - 48)));
            closeMiniTeethUpTo(ratio);
            if (ratio < 0.98) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        if (zipperFinishTimer) clearTimeout(zipperFinishTimer);
        zipperFinishTimer = window.setTimeout(() => finishMiniZipper(t0), 620);

        miniZipperHandle.addEventListener('transitionend', () => {
            if (zipperFinishTimer) {
                clearTimeout(zipperFinishTimer);
                zipperFinishTimer = null;
            }
            finishMiniZipper(t0);
        }, { once: true });
    };

    const resetDemo = () => {
        stopButtonTimer();
        document.removeEventListener('pointermove', onDocPointerMove);
        document.removeEventListener('pointerup', finishButtonDrag);
        document.removeEventListener('pointercancel', finishButtonDrag);
        if (zipperFinishTimer) {
            clearTimeout(zipperFinishTimer);
            zipperFinishTimer = null;
        }
        buttonStartTime = null;
        buttonOps = 0;
        fastenedCount = 0;
        dragState = null;
        zipperDone = false;
        zipperFinished = false;

        buttonPanel?.classList.remove('is-done');
        zipperPanel?.classList.remove('is-done');
        buttonPlacket.classList.remove('is-dragging');
        buttonStat.textContent = '耗时 — · 操作 0 次';
        zipperStat.textContent = '耗时 — · 操作 0 次';
        buttonHint.textContent = '按住每颗纽扣，拖拽扣入同高度的扣眼';
        zipperHint.textContent = '点击拉头，一次滑到底';

        buildButtons();
        miniZipper.classList.remove('is-closed', 'is-busy');
        buildMiniTeeth();
    };

    miniZipperHandle.addEventListener('pointerdown', runMiniZipper);
    miniZipperHandle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        runMiniZipper(e);
    });
    miniZipper.addEventListener('pointerdown', (e) => {
        if (zipperDone || miniZipper.classList.contains('is-closed')) return;
        if (e.target.closest('.mini-zipper__handle')) return;
        runMiniZipper(e);
    });
    resetBtn?.addEventListener('click', resetDemo);

    buildButtons();
    buildMiniTeeth();
})();

updateUI(window.innerHeight - 100);
