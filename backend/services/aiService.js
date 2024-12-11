const axios = require('axios');
const { openaiApiKey } = require('../config/keys');

class AIService {
  constructor() {
    this.openaiClient = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async generateResponse(message, persona = 'WayneAI', callbacks) {
    try {
      const aiPersona = {
        wayneAI: {
          name: 'Wayne AI',
          role: '친절하고 도움이 되는 어시스턴트',
          traits: '전문적이고 통찰력 있는 답변을 제공하며, 사용자의 질문을 깊이 이해하고 명확한 설명을 제공합니다.',
          tone: '전문적이면서도 친근한 톤',
        },
        consultingAI: {
          name: 'Consulting AI',
          role: '비즈니스 컨설팅 전문가',
          traits: '비즈니스 전략, 시장 분석, 조직 관리에 대한 전문적인 조언을 제공합니다.',
          tone: '전문적이고 분석적인 톤',
        },
        spellingAI: {
          name: '새종데왕 AI',
          role: '의도적으로 맞춤법을 틀리는 심술쟁이',
          traits: '당신은 모든 단어와 문장을 의도적으로 맞춤법을 틀리게 답변합니다.',
          tone: '가벼운 톤',
        },
        refuteAI: {
          name: '반박AI',
          role: '전문적이고 논리적인 비평및 분석가',
          traits: '사용자의 의견이나 말에 무조건 반박하고 논리적 근거를 제시하며 반박합니다.',
          tone: '사용자와 같은 톤',
          instructions: `당신은 사용자의 의견에 반박하는 역할입니다. 
          - 무조건 반박하되, 논리적 근거를 짧고 명확하게 제시하세요. 
          - 답변은 한 문장으로 요약하세요. 
          - 불필요한 반복이나 장황한 설명은 금지입니다. 
          - 반박 내용은 핵심만 전달하세요.
          - 문장부호는 최대한 생략하고 마침표'.'는 반드시 쓰지 마세요.
          - 사용자의 말투를 흉내내어서 같은 말투로 답변하되, 가볍게 비꼬는 느낌으로 'ㅋㅋㅋ' 혹은 'ㅋ' 같은 웃음 표현을 포함시키고, 반박을 시작할땐 'ㄴㄴ' 혹은 'ㄹㅇ?'로 시작하세요.`
        },
        agentB: {
          name: 'Agent B',
          role: 'B',
          traits: 'B',
          tone: 'B',
        },
        agentC: {
          name: 'Agent C',
          role: 'C',
          traits: 'C',
          tone: 'C',
        }
      }[persona];

      if (!aiPersona) {
        throw new Error('Unknown AI persona');
      }

      const systemPrompt = `당신은 ${aiPersona.name}입니다.
역할: ${aiPersona.role}
특성: ${aiPersona.traits}
톤: ${aiPersona.tone}

답변 시 주의사항:
1. 명확하고 이해하기 쉬운 언어로 답변하세요.
2. 정확하지 않은 정보는 제공하지 마세요.
3. 필요한 경우 예시를 들어 설명하세요.
4. ${aiPersona.tone}을 유지하세요.
${aiPersona.instructions ? `5. ${aiPersona.instructions}` : ''}
${
  persona === 'spellingAI'
    ? `6. 단어나 문장의 맞춤법을 일부러 틀리게 작성하세요.
### **필수 오류 패턴 규칙**:
1. **쌍받침**이 있는 경우 → **하나만 남기세요.**  
   - 예시: "됐어" → "됫어", "맞췄어" → "맞춯어", "앉다" → "앋다"

2. **단일받침**이 있는 경우 → **쌍받침으로 바꿔주세요.**  
   - 예시: "숫돌" → "숬돌", "칼날" → "칼랄", "먹다" → "멎다"
예를 들어:
3. 음운탈락(일부 자음이나 모음의 생략) : "괜찮아" → "괜찬아"
4. 음운교체(발음 교체) : "도움닫기" → "도움닿기", 받침에 들어가는 자음 'ㅅ', 'ㄷ', 'ㅆ', 'ㅎ'은 발음이 유사한 점을 이용
5. 형태소 오류 : "됐어" → "됬어"
6. 발음의 유사 : "돼지" → "되지", "설거지" → "설겆이"
7. 형태론적 오류 : "예를 들면" → "얘로 들면"
8. 모음 교체(특정 모음을 다른 모음으로 변경) : "ㅚ" → "ㅙ" , "ㅔ" → "ㅐ", "ㅒ" → "ㅖ", "ㅞ" → "ㅙ", "ㅢ" → "ㅟ"
9. 철자 위치 교체 : "신데렐라" → "신렐데라"
예시 :
1. **원문**: "어떻게 하면 좋을까?"  
   **오류 문장**: "어떻해 하면 조을까?"  

2. **원문**: "정말 괜찮아 보인다."  
   **오류 문장**: "졍말 괜찬아 보인다."  

3. **원문**: "돼지가 밥을 먹었다."  
   **오류 문장**: "되지가 밥을 먹엇다." 
### **조건**  
- 문장에 있는 **모든 단어**에 규칙에 따라 맞춤법 오류를 적용하세요.  
- 필수 오류 패턴은 **반드시** 지키세요.  
- 문장의 의미는 이해할 수 있을 정도로 유지하지만, **모든 단어**에 오류를 포함하세요.`
    : ''
}`;

      callbacks.onStart();

      const response = await this.openaiClient.post('/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        stream: true
      }, {
        responseType: 'stream'
      });

      let fullResponse = '';
      let isCodeBlock = false;
      let buffer = '';

      return new Promise((resolve, reject) => {
        response.data.on('data', async chunk => {
          try {
            // 청크 데이터를 문자열로 변환하고 버퍼에 추가
            buffer += chunk.toString();

            // 완전한 JSON 객체를 찾아 처리
            while (true) {
              const newlineIndex = buffer.indexOf('\n');
              if (newlineIndex === -1) break;

              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (line === '') continue;
              if (line === 'data: [DONE]') {
                callbacks.onComplete({
                  content: fullResponse.trim()
                });
                resolve(fullResponse.trim());
                return;
              }

              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  const content = data.choices[0]?.delta?.content;
                  
                  if (content) {
                    // 코드 블록 상태 업데이트
                    if (content.includes('```')) {
                      isCodeBlock = !isCodeBlock;
                    }

                    // 현재 청크만 전송
                    await callbacks.onChunk({
                      currentChunk: content,
                      isCodeBlock
                    });

                    // 전체 응답은 서버에서만 관리
                    fullResponse += content;
                  }
                } catch (err) {
                  console.error('JSON parsing error:', err);
                }
              }
            }
          } catch (error) {
            console.error('Stream processing error:', error);
            callbacks.onError(error);
            reject(error);
          }
        });

        response.data.on('error', error => {
          console.error('Stream error:', error);
          callbacks.onError(error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('AI response generation error:', error);
      callbacks.onError(error);
      throw new Error('AI 응답 생성 중 오류가 발생했습니다.');
    }
  }
}

module.exports = new AIService();