import { useEffect, useState } from 'react';

type CallTimerProps = {
    startedAt: number;
};

export function CallTimer({ startedAt }: CallTimerProps) {
    const [secondsElapsed, setSecondsElapsed] = useState(0);

    useEffect(() => {
        const updateTimer = () => {
            const diff = Math.floor((Date.now() - startedAt) / 1000);
            setSecondsElapsed(diff > 0 ? diff : 0);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    const minutes = Math.floor(secondsElapsed / 60);
    const seconds = secondsElapsed % 60;

    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <span className="text-xl font-mono font-semibold text-emerald-400 animate-pulse">
            {formattedTime}
        </span>
    );
}
