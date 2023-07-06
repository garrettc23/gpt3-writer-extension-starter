const getKey = () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['openai-key'], (result) => {
        if (result['openai-key']) {
          const decodedKey = atob(result['openai-key']);
          resolve(decodedKey);
        }
      });
    });
  };

  const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0].id;
  
      chrome.tabs.sendMessage(
        activeTab,
        { message: 'inject', content },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
          }
  
          if (response && response.status === 'failed') {
            console.log('injection failed.');
          }
        }
      );
    });
  };
  

const generate = async (prompt) => {
    const key = await getKey();
    const url = 'https://api.openai.com/v1/completions';
      
    const completionResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt: prompt,
        max_tokens: 1250,
        temperature: 1.1,
      }),
    });
      
    const completion = await completionResponse.json();
    return completion.choices.pop();
  }

const generateCompletionAction = async (info) => {
    try {
    sendMessage('generating...');
      const { selectionText } = info;
      const basePromptPrefix = `
      Write me detailed bullet points for a podcast script with the content below. Please make sure the bullet points go in-depth on the topic and shows that the podcast did its research.
      			
      Content:
      `;
    
      const baseCompletion = await generate(
        `${basePromptPrefix}${selectionText}`
      );
      const secondPrompt = `
      Take the detailed bullet points and content of the podcast below and generate a podcast script in a professional tone with a target duration of 3 minutes. Make it feel like a story and teach the audience something new. Don't just list the points. Go deep into each one. Explain why. Make sure the script has an intro, content section, and outro. Exclude onomatopoeia's while still making the script entertaining.
      
      Content: ${selectionText}
      
      Detailed Bullet Points: ${baseCompletion.text}
      
      Podcast Script:
      `;
    const secondPromptCompletion = await generate(secondPrompt);
    sendMessage(secondPromptCompletion.text);	
  } catch (error) {
    console.log(error);
    sendMessage(error.toString());
  }
};
  
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'context-run',
      title: 'Generate podcast script',
      contexts: ['selection'],
    });
  });
  
  chrome.contextMenus.onClicked.addListener(generateCompletionAction);