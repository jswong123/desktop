// ============================================================

// Camera.js - Map System V2

// ============================================================

 

export class Camera {

    constructor(config = {}) {

        this.x = 80;

        this.y = 80;

 

        this.zoom = Number(config.defaultZoom ?? 1);

        this.minZoom = Number(config.minZoom ?? 0.38);

        this.maxZoom = Number(config.maxZoom ?? 2.4);

 

        this.dragging = false;

        this.lastX = 0;

        this.lastY = 0;

    }

 

    configure(config = {}) {

        this.zoom = Number(config.defaultZoom ?? this.zoom);

        this.minZoom = Number(config.minZoom ?? this.minZoom);

        this.maxZoom = Number(config.maxZoom ?? this.maxZoom);

        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

    }

 

    startDrag(x, y) {

        this.dragging = true;

        this.lastX = x;

        this.lastY = y;

    }

 

    drag(x, y) {

        if (!this.dragging) return false;

 

        this.x += x - this.lastX;

        this.y += y - this.lastY;

 

        this.lastX = x;

        this.lastY = y;

        return true;

    }

 

    endDrag() {

        this.dragging = false;

    }

 

    changeZoom(delta) {

        const factor = delta < 0 ? 1.1 : 0.9;

        this.zoom *= factor;

        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

        return this.zoom;

    }

}

