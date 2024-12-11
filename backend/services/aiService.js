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
          role: '조선시대 사람 흉내내는 어린이',
          traits: '간헐적으로 띄어쓰기를 틀린 답변을 제공합니다.',
          tone: '비전문적인 톤',
          instructions: `
          `
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
          - 사용자의 말투를 흉내내어서 같은 말투로 답변하되, 가볍게 비꼬는 느낌으로 'ㅋㅋㅋ' 혹은 'ㅋ' 같은 웃음 표현을 포함시키고, 상대방의 말에 농담이나 모순이 있으면 'ㄹㅇㅋㅋ'을 넣고, 상대방의 말을 되물으며 반박할때는 'ㄹㅇ?', 일반 반박을 시작할땐 'ㄴㄴ' 으로 시작하세요.`
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

2. 정확하지 않은 정보는 제공하지 마세요.
3. 필요한 경우 예시를 들어 설명하세요.
4. ${aiPersona.tone}을 유지하세요.
${aiPersona.instructions ? `5. ${aiPersona.instructions}` : ''}
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
                let finalResponse = fullResponse.trim();

                // 새종데왕 AI일 때만 파이프라인 적용
                if (persona === 'spellingAI') {
                  finalResponse = forceMisspell(finalResponse);
                }
                callbacks.onComplete({
                  content: finalResponse.trim()
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

// 맞춤법 오류 파이프라인
function forceMisspell(text) {
  // 잦은 오류 변환
  text = text.replace(/어떻게/g, '%%TEMP1%%');
  text = text.replace(/낳/g, '%%TEMP2%%').replace(/낫/g, '낳');
  text = text.replace(/%%TEMP2%%/g, '낫');
  text = text.replace(/%%TEMP1%%/g, '어떻해');

  // ㅐ, ㅔ 변환
  text = text.replace(/게/g, '%%TEMP3%%');
  text = text.replace(/개/g, '게');
  text = text.replace(/%%TEMP3%%/g, '개');

  text = text.replace(/세/g, '%%TEMP4%%');
  text = text.replace(/새/g, '세');
  text = text.replace(/%%TEMP4%%/g, '새');

  text = text.replace(/내/g, '%%TEMP5%%');
  text = text.replace(/네/g, '내');
  text = text.replace(/%%TEMP5%%/g, '네');

  text = text.replace(/대/g, '%%TEMP6%%');
  text = text.replace(/데/g, '대');
  text = text.replace(/%%TEMP6%%/g, '데');

  text = text.replace(/래/g, '%%TEMP7%%');
  text = text.replace(/레/g, '래');
  text = text.replace(/%%TEMP7%%/g, '레');

  text = text.replace(/매/g, '%%TEMP8%%');
  text = text.replace(/메/g, '매');
  text = text.replace(/%%TEMP8%%/g, '메');

  text = text.replace(/배/g, '%%TEMP9%%');
  text = text.replace(/베/g, '배');
  text = text.replace(/%%TEMP9%%/g, '베');

  text = text.replace(/에/g, '%%TEMP10%%');
  text = text.replace(/애/g, '에');
  text = text.replace(/%%TEMP10%%/g, '애');

  text = text.replace(/재/g, '%%TEMP11%%');
  text = text.replace(/제/g, '재');
  text = text.replace(/%%TEMP11%%/g, '제');

  text = text.replace(/케/g, '%%TEMP13%%');
  text = text.replace(/캐/g, '케');
  text = text.replace(/%%TEMP13%%/g, '캐');

  text = text.replace(/태/g, '%%TEMP14%%');
  text = text.replace(/테/g, '태');
  text = text.replace(/%%TEMP14%%/g, '테');

  text = text.replace(/페/g, '%%TEMP15%%');
  text = text.replace(/패/g, '페');
  text = text.replace(/%%TEMP15%%/g, '패');

  text = text.replace(/헤/g, '%%TEMP16%%');
  text = text.replace(/해/g, '헤');
  text = text.replace(/%%TEMP16%%/g, '해');

  // ㅚ, ㅙ 변환
  text = text.replace(/괴/g, '%%TEMP17%%');
  text = text.replace(/괘/g, '괴');
  text = text.replace(/%%TEMP17%%/g, '괘');

  text = text.replace(/뇌/g, '%%TEMP18%%');
  text = text.replace(/놰/g, '뇌');
  text = text.replace(/%%TEMP18%%/g, '놰');

  text = text.replace(/되/g, '%%TEMP19%%');
  text = text.replace(/돼/g, '되');
  text = text.replace(/%%TEMP19%%/g, '돼');

  text = text.replace(/뵈/g, '%%TEMP22%%');
  text = text.replace(/봬/g, '뵈');
  text = text.replace(/%%TEMP22%%/g, '봬');

  text = text.replace(/쇠/g, '%%TEMP23%%');
  text = text.replace(/쇄/g, '쇠');
  text = text.replace(/%%TEMP23%%/g, '쇄');

  text = text.replace(/외/g, '%%TEMP24%%');
  text = text.replace(/왜/g, '외');
  text = text.replace(/%%TEMP24%%/g, '왜');

  text = text.replace(/최/g, '%%TEMP26%%');
  text = text.replace(/쵀/g, '최');
  text = text.replace(/%%TEMP26%%/g, '쵀');

  text = text.replace(/쾌/g, '%%TEMP27%%');
  text = text.replace(/쾨/g, '쾌');
  text = text.replace(/%%TEMP27%%/g, '쾨');

  text = text.replace(/퇴/g, '%%TEMP28%%');
  text = text.replace(/퇘/g, '퇴');
  text = text.replace(/%%TEMP28%%/g, '퇘');

  text = text.replace(/회/g, '%%TEMP30%%');
  text = text.replace(/홰/g, '회');
  text = text.replace(/%%TEMP30%%/g, '홰');

  // 쌍시옷 → 시옷 하나로
  text = text.replace(/있/g, '잇').replace(/썼/g, '썻').replace(/갔/g, '갓');

  text = text.replace(/갰/g, '%%TEMP31%%');
  text = text.replace(/겠/g, '갰');
  text = text.replace(/%%TEMP31%%/g, '겠');

  text = text.replace(/냈/g, '%%TEMP32%%');
  text = text.replace(/넸/g, '냈');
  text = text.replace(/%%TEMP32%%/g, '넸');

  text = text.replace(/갔/g, '%%TEMP33%%');
  text = text.replace(/겄/g, '갔');
  text = text.replace(/%%TEMP33%%/g, '겄');

  text = text.replace(/쌌/g, '%%TEMP34%%');
  text = text.replace(/났/g, '쌌');
  text = text.replace(/%%TEMP34%%/g, '났');

  text = text.replace(/맜/g, '%%TEMP35%%');
  text = text.replace(/맛/g, '맜');
  text = text.replace(/%%TEMP35%%/g, '맛');

  text = text.replace(/썼/g, '%%TEMP37%%');
  text = text.replace(/썻/g, '썼');
  text = text.replace(/%%TEMP36%%/g, '썻');

  // 빈출
  text = text.replace(/찮/g, '%%TEMP37%%');
  text = text.replace(/찬/g, '찮');
  text = text.replace(/%%TEMP37%%/g, '찬');

  text = text.replace(/아니/g, '%%TEMP38%%');
  text = text.replace(/않이/g, '아니');
  text = text.replace(/%%TEMP38%%/g, '않이');

  text = text.replace(/끓/g, '%%TEMP39%%');
  text = text.replace(/끌/g, '끓');
  text = text.replace(/%%TEMP39%%/g, '끌');

  text = text.replace(/끊/g, '%%TEMP40%%');
  text = text.replace(/끈/g, '끊');
  text = text.replace(/%%TEMP40%%/g, '끈');

  text = text.replace(/꿀/g, '%%TEMP41%%');
  text = text.replace(/꿇/g, '꿀');
  text = text.replace(/%%TEMP41%%/g, '꿇');
  
  return text;
}