import React from 'react';
import PersistentAvatar from '../../common/PersistentAvatar';
import MessageContent from './MessageContent';
import MessageActions from './MessageActions';
import ReadStatus from '../ReadStatus';

const AIMessage = ({ 
  msg = {}, 
  isStreaming = false,                   
  isMine = false, 
  currentUser = null,
  onReactionAdd,
  onReactionRemove,
  room = null,
  messageRef,
  socketRef
}) => {
  const formattedTime = new Date(msg.timestamp).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\./g, '년').replace(/\s/g, ' ').replace('일 ', '일 ');

  // AI 사용자 정보 생성
  const aiUser = {
    name: msg.aiType === 'wayneAI' ? 'Wayne AI' :
          msg.aiType === 'consultingAI' ? 'Consulting AI' :
          msg.aiType === 'refuteAI' ? '반박AI' :
          msg.aiType === 'agentB' ? '언어유희왕' :
          msg.aiType === 'hankangAI' ? '한강AI' :
          '새종데왕 AI',
    email: msg.aiType === 'wayneAI' ? 'ai@wayne.ai' :
          msg.aiType === 'consultingAI' ? 'ai@consulting.ai' :
          msg.aiType === 'refuteAI' ? 'ai@refuteAI.ai' :
          msg.aiType === 'agentB' ? 'ai@agentB.ai' :
          msg.aiType === 'hankangAI' ? 'ai@hankangAI.ai' :
          'ai@spelling.ai',
    avatarInitial: msg.aiType === 'wayneAI' ? 'W' :
                    msg.aiType === 'consultingAI' ? 'C' :
                    msg.aiType === 'refuteAI' ? 'A' :
                    msg.aiType === 'agentB' ? 'B' :
                    msg.aiType === 'hankangAI' ? 'H' :
                    <img src="images/asd.png" className="w-50" />
    };

  const renderContent = () => {
    if (isStreaming) {
      return (
        <>
          <MessageContent content={msg.content} />
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </>
      );
    }
    return <MessageContent content={msg.content} />;
  };

  return (
    <div className="message-group yours">
      <div className="message-sender-info">
        <PersistentAvatar 
          user={aiUser}
          size="lg"
          showInitials={true}
        />
        <span className="sender-name">
          {aiUser.name}
        </span>
      </div>
      <div className="message-bubble message-ai last relative group">
        <div className="message-content">
          {renderContent()}
        </div>
        
        {!isStreaming && (
          <div className="message-footer">
            <div className="message-time mr-3">
              {formattedTime}
            </div>
            <ReadStatus 
              messageType={msg.type}
              participants={room.participants}
              readers={msg.readers}
              messageId={msg._id}
              messageRef={messageRef}
              currentUserId={currentUser.id}
              socketRef={socketRef}
            />
          </div>
        )}        
      </div>
      
      <MessageActions 
        messageId={msg._id}
        messageContent={msg.content}
        reactions={msg.reactions}
        currentUserId={currentUser?.id}
        onReactionAdd={onReactionAdd}
        onReactionRemove={onReactionRemove}
        isMine={isMine}
        room={room}
      />
    </div>
  );
};

AIMessage.defaultProps = {
  msg: {},
  isStreaming: false,
  currentUser: null,
  onReactionAdd: () => {},
  onReactionRemove: () => {},
  room: null
};

export default React.memo(AIMessage);