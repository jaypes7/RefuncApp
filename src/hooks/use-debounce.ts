import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Só atualiza o valor depois que o tempo (delay) passar
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Se o usuário digitar outra letra antes do tempo acabar, cancela o timer anterior
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}