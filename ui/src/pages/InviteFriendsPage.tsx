import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { FriendListItem } from "@/components/FriendListItem";
import { friends } from "@/data/mockData";
import lettuceLogo from "@/assets/lettuce-logo.png";

export const InviteFriendsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = (friendId: string) => {
    setInvitedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateEvent = () => {
    navigate(`/restaurant/${id}/create-event`, { 
      state: { invitedFriends } 
    });
  };

  return (
    <div className="mobile-container pb-32">
      <Header 
        title="Invite Friends" 
        showBack 
        rightElement={<img src={lettuceLogo} alt="LettuceEat" className="w-10 h-10" />}
      />

      <div className="px-4">
        <SearchBar
          placeholder="Search Friends"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="mt-6 invite-card">
          {filteredFriends.map((friend) => (
            <FriendListItem
              key={friend.id}
              friend={friend}
              isInvited={invitedFriends.includes(friend.id)}
              onInvite={handleInvite}
              showInviteButton
            />
          ))}
          {filteredFriends.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No friends found
            </p>
          )}
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleCreateEvent}
            disabled={invitedFriends.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
};
