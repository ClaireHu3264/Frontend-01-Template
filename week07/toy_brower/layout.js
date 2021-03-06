function getStyle(element) {
    if (!element.style) {
        element.style = {};
        for (let prop in element.computedStyle) {
            element.style[prop] = element.computedStyle[prop].value;

            // 处理 属性值 转为 数字
            if (element.style[prop].toString().match(/px$/)) {
                element.style[prop] = parseInt(element.style[prop].replace("px", ''));
            }

            if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
                element.style[prop] = parseInt(element.style[prop]);
            }

        }
    }
    console.log('------');
    console.log(element.attributes[0].value);
    console.log(element.style)
    return element.style
}

function layout(element) {
    if (!element.computedStyle)
        return;

    const style = getStyle(element); // element  为 容器
    if (style.display != 'flex')
        return;

    const items = element.children.filter(e => e.type == 'element'); // 容器中的元素
    items.sort(function(a, b) {
        return (a.order || 0) - (b.order || 0) // order 会改变顺序
    })

    var sizeArr = ['width', 'height'];
    sizeArr.forEach(item => {
        if (style[item] === 'auto' || style[item] === '') {
            style[item] = null
        }
    })

    if (!style.flexDirection || style.flexDirection === 'auto') {
        style.flexDirection = 'row'
    }
    if (!style.alignItems || style.alignItems === 'auto') {
        style.alignItems = 'stretch'
    }
    if (!style.justifyContent || style.justifyContent === 'auto') {
        style.justifyContent = 'flex-start'
    }
    if (!style.flexWrap || style.flexWrap === 'auto') {
        style.flexWrap = 'nowrap'
    }
    if (!style.alignContent || style.alignContent === 'auto') {
        style.alignContent = 'stretch'
    }

    // main 主轴  cross 交叉轴
    let mainSize, mainStart, mainEnd, mainSign, mainBase, crossSize, crossStart, crossEnd, crossSign, crossBase;
    if (style.flexDirection == 'row') {
        mainSize = 'width';
        mainStart = 'left';
        mainEnd = 'right';
        mainSign = +1; // +1 / -1 标示符号，可以用于乘法
        mainBase = 0;
        crossSize = 'height';
        crossStart = 'top';
        crossEnd = 'bottom';
    } else if (style.flexDirection == 'row-reverse') {
        mainSize = 'width';
        mainStart = 'right'; // reverse
        mainEnd = 'left'; // reverse
        mainSign = -1; // reverse
        mainBase = style.width; // reverse
        crossSize = 'height';
        crossStart = 'top';
        crossEnd = 'bottom';
    } else if (style.flexDirection == 'column') {
        mainSize = 'height';
        mainStart = 'top';
        mainEnd = 'bottom';
        mainSign = +1;
        mainBase = 0;
        crossSize = 'width';
        crossStart = 'left';
        crossEnd = 'right';
    } else if (style.flexDirection == 'column-reverse') {
        mainSize = 'height';
        mainStart = 'bottom';
        mainEnd = 'top';
        mainSign = -1;
        mainBase = style.height;
        crossSize = 'width';
        crossStart = 'left';
        crossEnd = 'right';
    }

    if (style.flexWrap === 'wrap-reverse') {
        let tem = crossStart; // 交换纵轴crossStart 和 crossEnd
        crossStart = crossEnd;
        crossEnd = tem;
        crossSign = -1;
    } else {
        crossBase = 0;
        crossSign = +1;
    }

    let isAutoMainSize = false; // 容器 没有设置 【mainSize】，容器中子元素的和
    if (!style[mainSize]) {
        style[mainSize] = 0;
        for (let i = 0; i < items.length; i++) {
            let itemStyle = getStyle(items[i]);
            if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== (void 0)) {
                style[mainSize] += itemStyle[mainSize]
            }
        }
        isAutoMainSize = true;
    }
    // 进入行
    var flexLine = [];
    var flexLines = [flexLine];

    let mainSpace = style[mainSize];
    let crossSpace = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemStyle = getStyle(item);

        if (itemStyle[mainSize] === null) {
            itemStyle[mainSize] = 0;
        }

        if (itemStyle.flex) {
            flexLine.push(item); // mainSpace 不做处理
        } else if (style.flexWrap === 'nowrap' && isAutoMainSize) { // todo
            mainSpace -= itemStyle[mainSize];
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
            }
            flexLine.push(item);
        } else {
            if (itemStyle[mainSize] > style[mainSize]) {
                itemStyle[mainSize] = style[mainSize];
            }
            if (mainSpace < itemStyle[mainSize]) {
                flexLine.mainSpace = mainSpace;
                flexLine.crossSpace = crossSpace;
                // 重新创建新的行
                flexLine = [item]; // flexLine 指向新的对象，flexLines里面依然保存的是原来的对象
                flexLines.push(flexLine);
                mainSpace = style[mainSize]
                crossSpace = 0
            } else { // 未超过容器剩余 mainSpace，添加到行 
                flexLine.push(item)
            }
            // 处理交叉轴，只需要取 flex 子项最大 crossSize
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize])
            }
            // 容器剩余 mainSpace
            mainSpace -= itemStyle[mainSize]
        }
    }
    // 最后一行flexLine 的 mainSpace  和 crossSpace
    flexLine.mainSpace = mainSpace

    if (style.flexWrap === 'nowrap' || isAutoMainSize) {
        flexLine.crossSpace = (style[crossSize] !== undefined) ? style[crossSize] : crossSpace;
    } else {
        flexLine.crossSpace = crossSpace;
    }

    // 处理每行的剩余空间 对 每个元素进行定位
    if (mainSpace < 0) { // 最后一行
        const scale = style[mainSize] / (style[mainSize] - mainSpace);
        let currentMain = mainBase;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemStyle = getStyle(item);

            if (itemStyle.flex) {
                itemStyle[mainSize] = 0;
            }

            itemStyle[mainSize] = itemStyle[mainSize] * scale;
            itemStyle[mainStart] = currentMain;
            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
            currentMain = itemStyle[mainEnd];
        }
    } else {
        flexLines.forEach(function(flexLine) {
            const mainSpace = flexLine.mainSpace;
            let flexTotal = 0;

            for (let i = 0; i < flexLine.length; i++) {
                const item = flexLine[i];
                const itemStyle = getStyle(item);

                if ((itemStyle.flex !== null) && (itemStyle.flex !== (void 0))) {
                    flexTotal += itemStyle.flex;
                    continue
                }
            }

            if (flexTotal > 0) {
                let currentMain = mainBase;

                for (let i = 0; i < flexLine.length; i++) {
                    const item = flexLine[i];
                    const itemStyle = getStyle(item);

                    if (itemStyle.flex) {
                        itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
                    }
                    itemStyle[mainStart] = currentMain;
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
                    currentMain = itemStyle[mainEnd];
                }
            } else {
                let currentMain, gap;
                if (style.justifyContent === 'flex-start') {
                    currentMain = mainBase
                    gap = 0
                }
                if (style.justifyContent === 'flex-end') {
                    currentMain = mainSpace * mainSign + mainBase
                    gap = 0
                }
                if (style.justifyContent === 'center') {
                    currentMain = mainSpace / 2 * mainSign + mainBase
                    gap = 0
                }
                if (style.justifyContent === 'space-between') {
                    gap = mainSpace / (items.length - 1) * mainSign
                    currentMain = mainBase
                }
                if (style.justifyContent === 'space-around') {
                    gap = mainSpace / items.length * mainSign
                    currentMain = gap / 2 + mainBase
                }
                if (style.justifyContent === 'space-evenly') {
                    gap = mainSpace / (items.length + 1) * mainSign
                    currentMain = gap + mainBase
                }

                for (let i = 0; i < flexLine.length; i++) {
                    const item = flexLine[i];
                    const itemStyle = getStyle(item);
                    itemStyle[mainStart] = currentMain;
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
                    currentMain = itemStyle[mainEnd] + gap;
                }
            }
        })
    }

    // 处理交叉轴
    if (!style[crossSize]) { // 没有设定值
        crossSpace = 0
        style[crossSize] = 0
        for (let i = 0; i < flexLines.length; i++) {
            style[crossSize] = style[crossSize] + flexLines[i].crossSpace
        }
    } else {
        crossSpace = style[crossSize]
        for (let i = 0; i < flexLines.length; i++) {
            crossSpace -= flexLines[i].crossSpace
        }
    }

    if (style.flexWrap === 'wrap-reverse') {
        crossBase = style[crossSize]
    } else {
        crossBase = 0
    }

    let lineSize = style[crossSize] / flexLines.length

    let gap

    if (style.alignContent === 'flex-start') {
        crossBase += 0
        gap = 0
    }
    if (style.alignContent === 'flex-end') {
        crossBase += crossSign * crossSpace
        gap = 0
    }
    if (style.alignContent === 'center') {
        crossBase += crossSign * crossSpace / 2
        gap = 0
    }
    if (style.alignContent === 'space-between') {
        crossBase += 0
        gap = crossSpace / (flexLines.length - 1)
    }
    if (style.alignContent === 'space-around') {
        gap = crossSpace / (flexLines.length)
        crossBase += crossSign * step / 2
    }
    if (style.alignContent === 'stretch') {
        crossBase += 0
        gap = 0
    }

    flexLines.forEach(function(items) {
        let lineCrossSize = style.alignContent === 'stretch' ? // 拉伸 flex 子项，填满交叉轴
            items.crossSpace + crossSpace / flexLines.length :
            items.crossSpace

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const itemStyle = getStyle(item)

            const align = itemStyle.alignSelf || style.alignItems // align-self指控制单独某一个flex子项的垂直对齐方式
                // align-items属性，表示子项们

            if (itemStyle[crossSize] === null || itemStyle[crossSize] === (void 0)) {
                itemStyle[crossSize] = (align === 'stretch') ?
                    lineCrossSize : 0
            }

            if (align === 'flex-start') {
                itemStyle[crossStart] = crossBase
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
            }

            if (align === 'flex-end') {
                itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize
                itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize]
            }

            if (align === 'center') {
                itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
            }

            if (align === 'stretch') {
                itemStyle[crossStart] = crossBase
                itemStyle[crossEnd] = crossBase + crossSign * ((itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) ?
                    itemStyle[crossSize] : lineCrossSize)

                itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart])
            }
        }
        crossBase += crossSign * (lineCrossSize + gap)
    })

}

module.exports = layout;