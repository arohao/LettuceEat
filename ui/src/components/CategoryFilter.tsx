import { categories } from "@/data/mockData";

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export const CategoryFilter = ({ selected, onSelect }: CategoryFilterProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`category-chip whitespace-nowrap ${
            selected === category ? "category-chip-active" : "category-chip-inactive"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};
