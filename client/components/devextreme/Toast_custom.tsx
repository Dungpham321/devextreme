import React, { useCallback, useState } from 'react';
import Notify from 'devextreme/ui/notify';

export function showToast(message: string, type: string, time: number = 3500,
     position: 'top right' | 'top center' = 'top right',
    direction: 'up-push' | 'down-push' = 'down-push'
) {
    const fallbackPosition = { top: 20, right: 20 };
    let positionOption: any = fallbackPosition;
    const toastRoot = document.getElementById('toast-root');
    if (toastRoot) {
        const rect = toastRoot.getBoundingClientRect();
        positionOption = {
            top: rect.top + window.scrollY,
            right: window.innerWidth - rect.right + window.scrollX,
        };
    }
    Notify({
        message: message || `okkk`,
        height: 50,
        width: 250,
        minWidth: 250,
        type: type,
        displayTime: time,
        animation: {
            show: { type: 'fade', duration: 400, from: 0, to: 1 },
            hide: { type: 'fade', duration: 40, to: 0 },
        },
    }, {
        position: position,
        direction: direction,
    });
}

export function useToast() {
    const [toastId, setToastId] = useState(1);
    const triggerToast = useCallback(
        (message: string, type: string, time?: number,
            position?: 'top right' | 'top center',
            direction?: 'up-push' | 'down-push',
        ) => {
            showToast(message, type, time || 3500, position || "top right" , direction || 'down-push');
            setToastId((prev) => prev + 1);
        },
        [toastId]
    );
    return { triggerToast };
}
