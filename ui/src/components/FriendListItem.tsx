import { User, Plus, Check } from "lucide-react";
import { Friend } from "@/data/mockData";

interface FriendListItemProps {
  friend: Friend;
  isInvited?: boolean;
  onInvite?: (id: string) => void;
  showInviteButton?: boolean;
}

export const FriendListItem = ({ friend, isInvited, onInvite, showInviteButton = false }: FriendListItemProps) => {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <User size={24} className="text-muted-foreground" />
        </div>
        <span className="font-medium text-foreground">{friend.name}</span>
      </div>
      {showInviteButton && (
        <button
          onClick={() => onInvite?.(friend.id)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            isInvited
              ? "bg-primary text-primary-foreground border-primary"
              : "border-primary text-primary hover:bg-primary/10"
          }`}
        >
          {isInvited ? (
            <>
              <Check size={14} />
              <span>Invited</span>
            </>
          ) : (
            <>
              <Plus size={14} />
              <span>Invite Friend</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
