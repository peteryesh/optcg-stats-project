import { useState } from "react";
import { CardImage } from "../../../CardImage";
import '../../../Card.css';

export function LeaderZone() {
    return (
        <div className={`leader-zone`}>
            <div className="leader-container">
                <div className="play-card-display">
                    <div className="play-card-power">7000</div>
                    <div className="play-card-power-change">+1000</div>
                    <div className="rested-indicator">Rested</div>
                    <CardImage id="OP11-001_p1" name="Kobe" className="play-card-image" />
                </div>
            </div>
        </div>
    );
}