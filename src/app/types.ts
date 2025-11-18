export type Item = {
    readonly id: number;
    name: string;
    description: string | null;
    location?: Location | null;
    locationId: number | null;
    locationMarker?: ParentLocationMarker | null;
    additionalInfo: (ParentLocationMarker|Link)[] | null;
    imagePath: string | null;
};

export type Location = {
    readonly id: number;
    name: string;
    description: string;
    imagePath: string;
    parentId?: number;
    additionalInfo?: [ParentLocationMarker|Link]
};

export type ParentLocationMarker = {
    readonly id: number;
    y: number;
    x: number;
};

export type Link = {
    readonly id: number;
    name: string;
    url: string;
};
