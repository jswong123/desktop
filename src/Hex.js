export const SQRT3 = Math.sqrt(3);

 

 

export function hexToPixel(q, r, size) {

 

    return {

        x: size * SQRT3 * (q + r / 2),

        y: size * 1.5 * r

    };

 

}

 

 

export function drawHexPath(ctx, x, y, size) {

 

    ctx.beginPath();

 

    for (let i = 0; i < 6; i++) {

 

        const angle =

            Math.PI / 180 *

            (60 * i - 30);

 

        const px =

            x + size * Math.cos(angle);

 

        const py =

            y + size * Math.sin(angle);

 

 

        if (i === 0) {

 

            ctx.moveTo(px, py);

 

        } else {

 

            ctx.lineTo(px, py);

 

        }

 

    }

 

    ctx.closePath();

 

}

// ========================================

// 屏幕/世界坐标 -> 最近 Hex

// ========================================

 

export function pixelToHex(

    x,

    y,

    size

) {

 

    /*

     * 与当前 hexToPixel 使用的

     * axial 坐标系统对应。

     */

 

    const q =

        (

            Math.sqrt(3) / 3 * x -

            1 / 3 * y

        )

        / size;

 

 

    const r =

        (

            2 / 3 * y

        )

        / size;

 

 

    return axialRound(

        q,

        r

    );

 

}

 

 

// ========================================

// Axial rounding

// ========================================

 

function axialRound(

    q,

    r

) {

 

    const x = q;

 

    const z = r;

 

    const y =

        -x - z;

 

 

    let rx =

        Math.round(x);

 

    let ry =

        Math.round(y);

 

    let rz =

        Math.round(z);

 

 

    const xDiff =

        Math.abs(

            rx - x

        );

 

 

    const yDiff =

        Math.abs(

            ry - y

        );

 

 

    const zDiff =

        Math.abs(

            rz - z

        );

 

 

    if (

        xDiff > yDiff &&

        xDiff > zDiff

    ) {

 

        rx =

            -ry - rz;

 

    }

 

    else if (

        yDiff > zDiff

    ) {

 

        ry =

            -rx - rz;

 

    }

 

    else {

 

        rz =

            -rx - ry;

 

    }

 

 

    return {

 

        q: rx,

 

        r: rz

 

    };

 

}

 

 

// ========================================

// Hex 距离

// ========================================

 

export function hexDistance(

    a,

    b

) {

 

    return (

        Math.abs(

            a.q - b.q

        )

        +

        Math.abs(

            a.q +

            a.r -

            b.q -

            b.r

        )

        +

        Math.abs(

            a.r - b.r

        )

    ) / 2;

 

}
