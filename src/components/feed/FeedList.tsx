
import React from 'react';
import Post from './Post';
import { motion } from 'framer-motion';

// Sample data for our feed
const SAMPLE_POSTS = [
  {
    id: '1',
    author: {
      name: 'Outliers Network',
      username: 'outliersofc',
      avatar: 'https://via.placeholder.com/150',
      verified: true,
    },
    content: 'Welcome to Outliers, the premium business networking platform designed to connect professionals like you. Share your insights, expand your network, and grow your business with us!',
    images: ['https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop'],
    timestamp: '2 hours ago',
    likes: 128,
    comments: 24,
  },
  {
    id: '2',
    author: {
      name: 'Maria Silva',
      username: 'mariasilva',
      avatar: 'https://via.placeholder.com/150',
    },
    content: 'Just closed a major deal with an international client. Networking on this platform has been invaluable for my business growth! #BusinessGrowth #Networking',
    timestamp: '5 hours ago',
    likes: 45,
    comments: 8,
  },
  {
    id: '3',
    author: {
      name: 'João Mendes',
      username: 'joaomendes',
      avatar: 'https://via.placeholder.com/150',
    },
    content: 'Excited to announce our company\'s expansion to three new cities in Brazil. Looking for partners and talent in Rio, Brasília, and Salvador. DM me if interested!',
    images: [
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1920&auto=format&fit=crop'
    ],
    timestamp: '1 day ago',
    likes: 210,
    comments: 42,
  },
];

const FeedList: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="space-y-4">
        {SAMPLE_POSTS.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Post {...post} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default FeedList;
