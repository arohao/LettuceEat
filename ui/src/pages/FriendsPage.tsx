import { useState } from "react";
import { Plus, User } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { friends as initialFriends, Friend } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

export const FriendsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const { toast } = useToast();

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFriend = () => {
    if (!newFriendName.trim() || !newFriendEmail.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both name and email",
        variant: "destructive",
      });
      return;
    }

    const newFriend: Friend = {
      id: Date.now().toString(),
      name: newFriendName.trim(),
      email: newFriendEmail.trim(),
    };

    setFriends((prev) => [...prev, newFriend]);
    setNewFriendName("");
    setNewFriendEmail("");
    setShowAddForm(false);

    toast({
      title: "Friend added! 🎉",
      description: `${newFriend.name} has been added to your friends list`,
    });
  };

  return (
    <div className="mobile-container pb-24">
      <Header title="Friends" />

      <div className="px-4">
        <SearchBar
          placeholder="Search Friends"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 text-primary font-medium mt-4 mb-4"
        >
          <Plus size={20} />
          <span>Add New Friend</span>
        </button>

        {showAddForm && (
          <div className="bg-secondary rounded-2xl p-4 mb-6 animate-scale-in">
            <input
              type="text"
              placeholder="Friend's name"
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              className="w-full bg-background rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 mb-3"
            />
            <input
              type="email"
              placeholder="Friend's email"
              value={newFriendEmail}
              onChange={(e) => setNewFriendEmail(e.target.value)}
              className="w-full bg-background rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 mb-3"
            />
            <button onClick={handleAddFriend} className="btn-primary">
              Add Friend
            </button>
          </div>
        )}

        <div className="space-y-0">
          {filteredFriends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-3 py-4 border-b border-border"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User size={24} className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{friend.name}</p>
                <p className="text-sm text-muted-foreground">{friend.email}</p>
              </div>
            </div>
          ))}
          {filteredFriends.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No friends found
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
