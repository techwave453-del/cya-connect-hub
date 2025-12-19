import { Heart, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import React from "react";

interface PostCardProps {
  username: string;
  date: string;
  hashtag: string;
  image?: string;
  title?: string;
  likes?: number;
  comments?: number;
  className?: string;
  style?: React.CSSProperties;
  userId?: string;
}

const PostCard = ({
  username,
  date,
  hashtag,
  image,
  title,
  likes = 0,
  comments = 0,
  className,
  style,
  userId,
}: PostCardProps) => {
  const UsernameComponent = userId ? (
    <Link 
      to={`/profile/${userId}`}
      className="text-primary font-semibold text-lg hover:underline"
    >
      {username}
    </Link>
  ) : (
    <h3 className="text-primary font-semibold text-lg">{username}</h3>
  );

  return (
    <article
      style={style}
      className={cn(
        "bg-card rounded-lg overflow-hidden border-l-4 border-l-primary card-shadow animate-slide-up",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            {UsernameComponent}
            <p className="text-muted-foreground text-sm">{date}</p>
          </div>
        </div>
        
        <span className="inline-block text-foreground/90 font-medium mb-3">
          #{hashtag}
        </span>
        
        {image && (
          <div className="relative rounded-lg overflow-hidden mt-2">
            <img
              src={image}
              alt={title || "Post image"}
              className="w-full h-48 object-cover"
            />
            {title && (
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex items-end p-4">
                <h4 className="text-2xl font-heading font-bold text-foreground">
                  {title}
                </h4>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-6 px-4 py-3 border-t border-border/30">
        <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Heart className="w-5 h-5" />
          <span className="text-sm">{likes}</span>
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{comments}</span>
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors ml-auto">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </article>
  );
};

export default PostCard;
