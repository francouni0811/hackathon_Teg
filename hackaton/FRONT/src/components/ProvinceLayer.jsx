import Province from "./Province";

const PROVINCE_GEOMETRY = {
  altiplano: {
    path: "M232 148 L312 122 L362 164 L346 246 L258 268 L204 208 Z",
    badge: { x: 286, y: 198 },
  },
  "gran-chaquena": {
    path: "M358 164 L516 146 L594 212 L576 302 L450 338 L350 286 Z",
    badge: { x: 470, y: 236 },
  },
  "valles-del-norte": {
    path: "M256 274 L372 254 L444 318 L428 408 L318 446 L238 374 Z",
    badge: { x: 340, y: 344 },
  },
  litoral: {
    path: "M584 286 L704 294 L760 374 L734 460 L628 498 L560 428 Z",
    badge: { x: 655, y: 382 },
  },
  cuyo: {
    path: "M232 430 L340 410 L404 484 L382 574 L288 614 L214 540 Z",
    badge: { x: 304, y: 506 },
  },
  "pampa-central": {
    path: "M408 430 L572 428 L646 510 L626 612 L506 668 L390 596 Z",
    badge: { x: 512, y: 536 },
  },
  "cordillera-sur": {
    path: "M248 614 L368 592 L430 674 L412 772 L312 826 L234 746 Z",
    badge: { x: 322, y: 704 },
  },
  "costa-atlantica": {
    path: "M642 518 L746 530 L796 622 L768 728 L682 772 L622 684 Z",
    badge: { x: 710, y: 642 },
  },
  "patagonia-norte": {
    path: "M430 680 L626 668 L706 760 L676 878 L540 934 L414 846 Z",
    badge: { x: 548, y: 798 },
  },
  "patagonia-austral": {
    path: "M414 936 L568 920 L632 1024 L600 1146 L500 1224 L394 1120 Z",
    badge: { x: 508, y: 1042 },
  },
  "tierra-del-fuego": {
    path: "M462 1238 L556 1230 L604 1284 L578 1338 L486 1348 L436 1296 Z",
    badge: { x: 520, y: 1288 },
  },
};

function ProvinceLayer({ provincias, playersById, selectedIds, validTargetIds, onProvinceClick }) {
  return (
    <svg className="province-layer" viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid meet">
      {provincias.map((provincia) => {
        const geometry = PROVINCE_GEOMETRY[provincia.id];
        if (!geometry) return null;

        const ownerColor = playersById[provincia.owner]?.color || "#8f7e63";

        return (
          <Province
            key={provincia.id}
            provincia={provincia}
            geometry={geometry}
            ownerColor={ownerColor}
            isSelected={selectedIds.has(provincia.id)}
            isValidTarget={validTargetIds.has(provincia.id)}
            onClick={() => onProvinceClick(provincia.id)}
          />
        );
      })}
    </svg>
  );
}

export default ProvinceLayer;
