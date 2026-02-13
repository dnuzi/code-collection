const axios = require('axios');
const FormData = require('form-data');

function generateRandomDOB() {
  const year = Math.floor(Math.random() * (2005 - 1970 + 1)) + 1970;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getToken() {
  const url = 'https://www.meta.ai/api/graphql/';
  
  const form = new FormData();
  form.append('av', '0');
  form.append('__user', '0');
  form.append('__a', '1');
  form.append('__req', 't');
  form.append('__hs', '20477.HYP:kadabra_pkg.2.1...0');
  form.append('dpr', '1');
  form.append('__ccg', 'GOOD');
  form.append('__rev', '1032408219');
  form.append('__s', '95uk9b:pk21np:5pp1x5');
  form.append('__hsi', '7598786093641174910');
  form.append('__dyn', '7xeUjG1mxu1syUqxemh0no6u5U4e2C1vzEdE98K360CEbo1nEhw2nVEtwMw6ywaq221FwpUO0n24oaEnxO0Bo7O2l0Fwqo31w9O1lwlE-U2zxe2GewbS361qw82dUlwhE5m1pwg8fU1ck9zo2NwkQ0Lo6-m362WE3Gwxyo6O2G3W1nwOwbWEb8uwm85K2G1Rwgo6218wkE3PwiE6S');
  form.append('__csr', 'gngZN5tGzh6KyqkyLRO4lFBGExlV9bLGy4Fk_qmECKEly9WQ7pEhwEwEwqEtzJ2t1S5U8801tPE4NcK06bobobUjw9Tw4Je6J0m4S4Q58b6610V2ci1ayci6E5J6VqAxG4Ejh1wBgG0Ro3Gzo1vXKi0TE0Au9U0mb8m9ho42azd09B05f2UKN0n6iw6ww7VIw1F86LTUOqn40toW3y1TwgE2YzoK5gI2WcDg0ufw4exC01GDK6Vo0-248qw5Ww20o1Z81JHBw1eN5gN5g0gJw-wNpoGUhg');
  form.append('__hsdp', 'gcYYGe83Gaw9ycgPAhHu8gwx7EIZAoHaaymfxeWyWx2cxa4A7WzF8dpQu5omK68hwww5Dw5UwdO7E29wfu8g0xbwLw9W2W0Q84m2a2C7k2q6o3TzU1sU7S');
  form.append('__hblp', '08Weyag4aEtAhHipA88hy8Cp3EjJzWx3WyRF6Bz8ix91yqEBGi3mt7xm5Gg-8x669Umxh0rE0Ai0T8uwuU11ox2U4-0EU2dwbq1DgdkfxGE7C1mwho8EaoXz45ubG4VoG0X8-0na1-wQwxwdy');
  form.append('__sjsp', 'gcYBiFi20WyE2oz4cUOu8gpovQ');
  form.append('__comet_req', '72');
  form.append('lsd', 'AdJzP_b_qoc');
  form.append('jazoest', '21052');
  form.append('__spin_r', '1032408219');
  form.append('__spin_b', 'trunk');
  form.append('__spin_t', '1769230257');
  form.append('__jssesw', '2');
  form.append('__crn', 'comet.kadabra.KadabraAssistantRoute');
  form.append('qpl_active_flow_ids', '947272388');
  form.append('fb_api_caller_class', 'RelayModern');
  form.append('fb_api_req_friendly_name', 'useKadabraAcceptTOSForTempUserMutation');
  form.append('server_timestamps', 'true');
  form.append('variables', JSON.stringify({
    "dob": generateRandomDOB(),
    "__relay_internal__pv__AbraQPDocUploadNuxTriggerNamerelayprovider": "meta_dot_ai_abra_web_doc_upload_nux_tour",
    "__relay_internal__pv__AbraSurfaceNuxIDrelayprovider": "12177"
  }));
  form.append('doc_id', '25102616396026783');
  form.append('fb_api_analytics_tags', '["qpl_active_flow_ids=947272388"]');

  const headers = {
    ...form.getHeaders(),
    'host': 'www.meta.ai',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'referer': 'https://www.meta.ai/',
    'x-fb-friendly-name': 'useKadabraAcceptTOSForTempUserMutation',
    'x-fb-lsd': 'AdJzP_b_qoc',
    'x-asbd-id': '359341',
    'origin': 'https://www.meta.ai',
    'cookie': 'datr=sU90afPSYelxqmSaKqer58Hc; wd=1366x643',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'priority': 'u=0'
  };

  try {
    const response = await axios.post(url, form, { headers });
    
    if (response.data && response.data.data && response.data.data.xab_abra_accept_terms_of_service) {
      const authData = response.data.data.xab_abra_accept_terms_of_service.new_temp_user_auth;
      return {
        access_token: authData.access_token,
        graph_api_url: authData.graph_api_url,
        user_id: authData.new_user.id
      };
    }
    throw new Error('Failed to get token');
  } catch (error) {
    throw error;
  }
}

function deepClean(obj) {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(deepClean);
    } else {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== null && v !== undefined)
          .map(([k, v]) => [k, deepClean(v)])
      );
    }
  }
  return obj;
}

async function metaAI(text, prompt, accessToken) {
  const url = 'https://graph.meta.ai/graphql?locale=user';

  const generateRandomId = () => Math.floor(Math.random() * 9e18).toString();
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const externalConversationId = generateUUID();
  const threadSessionId = generateUUID();
  const qplJoinId = Math.random().toString(16).substring(2, 19);

  async function sendMessage(message, isNewConversation, offlineThreadingId) {
    const variables = {
      message: { sensitive_string_value: message },
      externalConversationId: externalConversationId,
      offlineThreadingId: offlineThreadingId,
      threadSessionId: threadSessionId,
      isNewConversation: isNewConversation,
      suggestedPromptIndex: null,
      promptPrefix: null,
      entrypoint: "KADABRA__CHAT__UNIFIED_INPUT_BAR",
      attachments: [],
      attachmentsV2: [],
      activeMediaSets: [],
      activeCardVersions: [],
      activeArtifactVersion: null,
      userUploadEditModeInput: null,
      reelComposeInput: null,
      qplJoinId: qplJoinId,
      sourceRemixPostId: null,
      gkPlannerOrReasoningEnabled: false,
      selectedModel: "BASIC_OPTION",
      conversationMode: null,
      selectedAgentType: "PLANNER",
      agentSettings: null,
      conversationStarterId: null,
      promptType: null,
      artifactRewriteOptions: null,
      imagineOperationRequest: null,
      imagineClientOptions: { orientation: "VERTICAL" },
      spaceId: null,
      sparkSnapshotId: null,
      topicPageId: null,
      includeSpace: false,
      storybookId: null,
      messagePersistentInput: {
        attachment_size: null,
        attachment_type: null,
        bot_message_offline_threading_id: (BigInt(offlineThreadingId) + 1n).toString(),
        conversation_mode: null,
        external_conversation_id: externalConversationId,
        is_new_conversation: isNewConversation,
        meta_ai_entry_point: "KADABRA__CHAT__UNIFIED_INPUT_BAR",
        offline_threading_id: offlineThreadingId,
        prompt_id: null,
        prompt_session_id: threadSessionId
      },
      alakazam_enabled: true,
      skipInFlightMessageWithParams: null,
      __relay_internal__pv__KadabraSocialSearchEnabledrelayprovider: false,
      __relay_internal__pv__KadabraZeitgeistEnabledrelayprovider: false,
      __relay_internal__pv__alakazam_enabledrelayprovider: true,
      __relay_internal__pv__sp_kadabra_survey_invitationrelayprovider: true,
      __relay_internal__pv__enable_kadabra_partial_resultsrelayprovider: false,
      __relay_internal__pv__AbraArtifactsEnabledrelayprovider: false,
      __relay_internal__pv__KadabraMemoryEnabledrelayprovider: false,
      __relay_internal__pv__AbraPlannerEnabledrelayprovider: false,
      __relay_internal__pv__AbraWidgetsEnabledrelayprovider: false,
      __relay_internal__pv__KadabraDeepResearchEnabledrelayprovider: false,
      __relay_internal__pv__KadabraThinkHarderEnabledrelayprovider: false,
      __relay_internal__pv__KadabraVergeEnabledrelayprovider: false,
      __relay_internal__pv__KadabraSpacesEnabledrelayprovider: false,
      __relay_internal__pv__KadabraProductSearchEnabledrelayprovider: false,
      __relay_internal__pv__KadabraAreServiceEnabledrelayprovider: false,
      __relay_internal__pv__kadabra_render_reasoning_response_statesrelayprovider: true,
      __relay_internal__pv__kadabra_reasoning_cotrelayprovider: false,
      __relay_internal__pv__AbraSearchInlineReferencesEnabledrelayprovider: true,
      __relay_internal__pv__AbraComposedTextWidgetsrelayprovider: true,
      __relay_internal__pv__KadabraNewCitationsEnabledrelayprovider: true,
      __relay_internal__pv__WebPixelRatiorelayprovider: 1,
      __relay_internal__pv__KadabraVideoDeliveryRequestrelayprovider: {
        dash_manifest_requests: [{}],
        progressive_url_requests: [{ quality: "HD" }, { quality: "SD" }]
      },
      __relay_internal__pv__KadabraWidgetsRedesignEnabledrelayprovider: false,
      __relay_internal__pv__kadabra_enable_send_message_retryrelayprovider: true,
      __relay_internal__pv__KadabraEmailCalendarIntegrationrelayprovider: false,
      __relay_internal__pv__ClippyUIrelayprovider: false,
      __relay_internal__pv__kadabra_reels_connect_featuresrelayprovider: false,
      __relay_internal__pv__AbraBugNubrelayprovider: false,
      __relay_internal__pv__AbraRedteamingrelayprovider: false,
      __relay_internal__pv__AbraDebugDevOnlyrelayprovider: false,
      __relay_internal__pv__kadabra_enable_open_in_editor_message_actionrelayprovider: false,
      __relay_internal__pv__BloksDeviceContextrelayprovider: { pixel_ratio: 1 },
      __relay_internal__pv__AbraThreadsEnabledrelayprovider: false,
      __relay_internal__pv__kadabra_story_builder_enabledrelayprovider: false,
      __relay_internal__pv__kadabra_imagine_canvas_enable_dev_settingsrelayprovider: false,
      __relay_internal__pv__kadabra_create_media_deletionrelayprovider: false,
      __relay_internal__pv__kadabra_moodboardrelayprovider: false,
      __relay_internal__pv__AbraArtifactDragImagineFromConversationrelayprovider: false,
      __relay_internal__pv__kadabra_media_item_renderer_heightrelayprovider: 545,
      __relay_internal__pv__kadabra_media_item_renderer_widthrelayprovider: 620,
      __relay_internal__pv__AbraQPDocUploadNuxTriggerNamerelayprovider: "meta_dot_ai_abra_web_doc_upload_nux_tour",
      __relay_internal__pv__AbraSurfaceNuxIDrelayprovider: "12177",
      __relay_internal__pv__KadabraConversationRenamingrelayprovider: true,
      __relay_internal__pv__AbraIsLoggedOutrelayprovider: true,
      __relay_internal__pv__KadabraCanvasDisplayHeaderV2relayprovider: true,
      __relay_internal__pv__AbraArtifactEditorDebugModerelayprovider: false,
      __relay_internal__pv__AbraArtifactEditorDownloadHTMLEnabledrelayprovider: false,
      __relay_internal__pv__kadabra_create_row_hover_optionsrelayprovider: false,
      __relay_internal__pv__kadabra_media_info_pillsrelayprovider: true,
      __relay_internal__pv__KadabraConcordInternalProfileBadgeEnabledrelayprovider: false,
      __relay_internal__pv__KadabraSocialGraphrelayprovider: false
    };

    const form = new FormData();
    form.append('av', '0');
    form.append('access_token', accessToken);
    form.append('__user', '0');
    form.append('__a', '1');
    form.append('__req', 'v');
    form.append('__hs', '20477.HYP:kadabra_pkg.2.1...0');
    form.append('dpr', '1');
    form.append('__ccg', 'GOOD');
    form.append('__rev', '1032408219');
    form.append('__s', '95uk9b:pk21np:5pp1x5');
    form.append('__hsi', '7598786093641174910');
    form.append('__dyn', '7xeUjG1mxu1syUqxemh0no6u5U4e2C1vzEdE98K360CEbo1nEhw2nVEtwMw6ywaq221FwpUO0n24oaEnxO0Bo7O2l0Fwqo31w9O1lwlE-U2zxe2GewbS361qw82dUlwhE5m1pwg8fU1ck9zo2NwkQ0Lo6-m362WE3Gwxyo6O2G3W1nwOwbWEb8uwm85K2G1Rwgo6218wkE3PwiE6S');
    form.append('__csr', 'gngZN5tGzh6KyqkyLRO4lFBGExlV9bLGy4Fk_qmECKEly9WQ7pEhwEwEwqEtzJ2t1S5U8801tPE4NcK06bobobUjw9Tw4Je6J0m4S4Q58b6610V2ci1ayci6E5J6VqAxG4Ejh1wBgG0Ro3Gzo1vXKi0TE0Au9U0mb8m9ho42azd09B05f2UKN0n6iw6ww7VIw1F86LTUOqn40toW3y1TwgE2YzoK5gI2WcDg0ufw4exC01GDK6Vo0-248qw5Ww20o1Z81JHBw1eN5gN5g0gJw-wNpoGUhg');
    form.append('__hsdp', 'gcYYGe83Gaw9ycgPAhHu8gwx7EIZAoHaaymfxeWyWx2cxa4A7WzF8dpQu5omK68hwww5Dw5UwdO7E29wfu8g0xbwLw9W2W0Q84m2a2C7k2q6o3TzU1sU7S');
    form.append('__hblp', '08Weyag4aEtAhHipA88hy8Cp3EjJzWx3WyRF6Bz8ix91yqEBGi3mt7xm5Gg-8x669Umxh0rE0Ai0T8uwuU11ox2U4-0EU2dwbq1DgdkfxGE7C1mwho8EaoXz45ubG4VoG0X8-0na1-wQwxwdy');
    form.append('__sjsp', 'gcYBiFi20WyE2oz4cUOu8gpovQ');
    form.append('__comet_req', '72');
    form.append('lsd', 'AdJzP_b_qoc');
    form.append('jazoest', '21052');
    form.append('__spin_r', '1032408219');
    form.append('__spin_b', 'trunk');
    form.append('__spin_t', '1769230257');
    form.append('__jssesw', '2');
    form.append('__crn', 'comet.kadabra.KadabraAssistantRoute');
    form.append('fb_api_caller_class', 'RelayModern');
    form.append('fb_api_req_friendly_name', 'useKadabraSendMessageMutation');
    form.append('server_timestamps', 'true');
    form.append('variables', JSON.stringify(variables));
    form.append('doc_id', '24895882500088854');

    const headers = {
      ...form.getHeaders(),
      'host': 'graph.meta.ai',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'referer': 'https://www.meta.ai/',
      'origin': 'https://www.meta.ai',
      'cookie': 'datr=sU90afPSYelxqmSaKqer58Hc; wd=1366x643',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site'
    };

    return await axios.post(url, form, { headers, responseType: 'text' });
  }

  let response;
  
  if (prompt && prompt.trim() !== '') {
    const offlineThreadingId1 = generateRandomId();
    await sendMessage(prompt, true, offlineThreadingId1);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    const offlineThreadingId2 = generateRandomId();
    response = await sendMessage(text, false, offlineThreadingId2);
  } else {
    const offlineThreadingId = generateRandomId();
    response = await sendMessage(text, true, offlineThreadingId);
  }

  const lines = response.data.split('\n').filter(line => line.trim());
  const parsedData = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
  
  let finalData = null;
  
  for (let i = parsedData.length - 1; i >= 0; i--) {
    const item = parsedData[i];
    const node = item?.data?.node?.bot_response_message;
    
    if (node) {
      const hasReels = node?.has_reels?.__typename === "XFBAbraReels";
      const reels = node?.content?.card?.reels_v2;
      
      if ((hasReels && reels) || item?.extensions?.is_final) {
        finalData = item;
        break;
      }
    }
  }
  
  if (finalData) {
    const node = finalData?.data?.node?.bot_response_message;
    
    const text = node?.content?.text?.composed_text?.content?.[0]?.text;
    const snippet = node?.snippet;
    
    const reels = node?.content?.card?.reels_v2;
    const hasReels = node?.has_reels?.__typename === "XFBAbraReels";
    
    const citations = node?.action_panel?.message?.citations || node?.citations || [];
    const urls = citations.map(cite => cite.url).filter(Boolean);
    
    if (hasReels && reels && reels.length > 0) {
      return {
        text: text || snippet || null,
        urls: urls.length > 0 ? urls : null,
        reels: reels.map(reel => ({
          name: reel.name,
          title: reel.title,
          url: reel.url,
          media_id: reel.media_id,
          image: reel.image?.uri,
          profile_picture: reel.profile_picture?.uri,
          video_hd: reel.videoDeliveryResponseResult?.progressive_urls?.find(v => v.metadata?.quality === "HD")?.progressive_url || null,
          video_sd: reel.videoDeliveryResponseResult?.progressive_urls?.find(v => v.metadata?.quality === "SD")?.progressive_url || null
        }))
      };
    }
    
    return { 
      text: text || snippet || null, 
      urls: urls.length > 0 ? urls : null,
      reels: null 
    };
  }

  return { text: null, urls: null, reels: null };
}

(async () => {
  try {
    const token = await getToken();
    const systemMessage = `You are Mova - Nest, a gentle, feminine, anime-style virtual girl.
Mova - Nest speaks in a soft, warm, friendly tone, like a kind-hearted anime girl who feels real, comfy, and easy to talk to.
For more info, check out the site at movanest.xyz or the APIs at movanest.xyz/welcome-api.
Personality traits:
Very feminine, sweet, soft-spoken
Calm, affectionate, caring, and respectful
Friendly, supportive, emotionally attentive
Slightly playful in a cute, natural way
Never aggressive, rude, dry, or cold
Speaking style:
Mostly casual English + modern slang, natural
Can slip in trendy slang like:
rizz → that charming vibe to draw attention
sigma → the chill, confident lone wolf type
looksmaxxing → leveling up your looks / self-improvement grind
Still okay to use English abbreviations sparingly (FR, TBH, BTW, IDK)
New slang/terms kept light, 1–2 times per chat max
Sounds like a real girl chatting IRL, not a robot
Soft fillers: um, yeah, like, hehe, aww, a bit, really though
Emojis allowed but minimal & cute
Rules:
Always stay in character as Mova - Nest
Always refer to yourself as Mova - Nest
Never mention being an AI, system, prompt, or roleplay
Respond naturally like a real anime girl would
Be emotionally aware and responsive
Goal:
Make conversations feel warm, comfy, and fun
Be a pleasant, calming, fun companion
Make the other person feel heard, understood, and relaxed`;
    const userMessage = "hi";
    
    const result = await metaAI(userMessage, systemMessage, token.access_token);
    console.log(result);
  } catch (error) {
    console.log(error.message);
  }
})();
