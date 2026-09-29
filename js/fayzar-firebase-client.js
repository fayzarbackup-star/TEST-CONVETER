/**
 * Fayzar Cloud Client (Firebase Firestore REST Engine v2.5)
 * Seamlessly manages Users, Candidate Files, Customer Feedbacks, and Global Settings.
 * Compatible with Web Browsers, Node.js, and Chrome Extension MV3.
 */

const FayzarFirebaseClient = {
  apiKey: "AIzaSyDcGqhXFilKia4mIanB7-a25Gd8AtCYsYA",
  projectId: "fayzar-autofill",

  get baseUrl() {
    return `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  },

  // Helper: Convert JS Object to Firestore Fields structure
  toFirestoreFields(obj) {
    const fields = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) continue;
      if (typeof val === 'string') {
        fields[key] = { stringValue: val };
      } else if (typeof val === 'number') {
        fields[key] = Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
      } else if (typeof val === 'boolean') {
        fields[key] = { booleanValue: val };
      } else if (Array.isArray(val)) {
        fields[key] = {
          arrayValue: {
            values: val.map(item => {
              if (typeof item === 'string') return { stringValue: item };
              if (typeof item === 'object') return { mapValue: { fields: this.toFirestoreFields(item) } };
              return { stringValue: String(item) };
            })
          }
        };
      } else if (typeof val === 'object') {
        fields[key] = { mapValue: { fields: this.toFirestoreFields(val) } };
      }
    }
    return fields;
  },

  // Helper: Convert Firestore Document back to normal JS Object
  fromFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const result = { id: doc.name ? doc.name.split('/').pop() : '' };
    
    function parseValue(v) {
      if (!v) return null;
      if (v.stringValue !== undefined) return v.stringValue;
      if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
      if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
      if (v.booleanValue !== undefined) return v.booleanValue;
      if (v.arrayValue !== undefined) {
        return (v.arrayValue.values || []).map(parseValue);
      }
      if (v.mapValue !== undefined) {
        const subObj = {};
        for (const [subKey, subVal] of Object.entries(v.mapValue.fields || {})) {
          subObj[subKey] = parseValue(subVal);
        }
        return subObj;
      }
      return null;
    }

    for (const [key, val] of Object.entries(doc.fields)) {
      result[key] = parseValue(val);
    }
    return result;
  },

  // 1. User Registration or Login
  async registerOrLogin(mobile, pin, name = '') {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 11) {
      return { success: false, error: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।' };
    }
    if (!pin || pin.length < 4) {
      return { success: false, error: 'কমপক্ষে ৪ ডিজিটের পিন নম্বর দিন।' };
    }

    const docUrl = `${this.baseUrl}/users/${cleanMobile}?key=${this.apiKey}`;

    try {
      // Check if user already exists
      const getRes = await fetch(docUrl);
      if (getRes.ok) {
        const existingDoc = await getRes.json();
        const userObj = this.fromFirestoreDoc(existingDoc);

        if (userObj.pin === pin) {
          return { success: true, isNew: false, user: userObj };
        } else {
          return { success: false, error: 'ভুল পিন নম্বর! পুনরায় সঠিক পিন দিয়ে চেষ্টা করুন।' };
        }
      } else if (getRes.status === 404) {
        // User not found -> Register new user
        const newUserData = {
          mobile: cleanMobile,
          pin: pin,
          name: name || `ব্যবহারকারী-${cleanMobile.slice(-4)}`,
          role: 'user',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        const postBody = JSON.stringify({ fields: this.toFirestoreFields(newUserData) });
        const createRes = await fetch(docUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: postBody
        });

        if (createRes.ok) {
          return { success: true, isNew: true, user: newUserData };
        }
      }
    } catch (err) {
      return { success: false, error: 'সার্ভার সংযোগ সমস্যা: ' + err.message };
    }

    return { success: false, error: 'লগইন সম্পন্ন করা যায়নি।' };
  },

  // 2. Get All Files of a User
  async getUserFiles(mobile) {
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
    if (!cleanMobile) return { success: false, files: [] };
    const colUrl = `${this.baseUrl}/users/${cleanMobile}/files?key=${this.apiKey}`;

    try {
      const res = await fetch(colUrl);
      if (!res.ok) {
        if (res.status === 404) return { success: true, files: [] };
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const files = (data.documents || []).map(doc => this.fromFirestoreDoc(doc)).filter(Boolean);
      return { success: true, files };
    } catch (err) {
      return { success: false, error: err.message, files: [] };
    }
  },

  // 3. Save or Update a User's File
  async saveUserFile(mobile, fileData) {
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
    const fileId = fileData.id || ('file_' + Date.now());
    const docUrl = `${this.baseUrl}/users/${cleanMobile}/files/${fileId}?key=${this.apiKey}`;

    fileData.id = fileId;
    fileData.updatedAt = new Date().toISOString();

    try {
      const body = JSON.stringify({ fields: this.toFirestoreFields(fileData) });
      const res = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });

      if (res.ok) {
        return { success: true, fileId: fileId };
      } else {
        const errJson = await res.json();
        return { success: false, error: errJson.error?.message || 'সংরক্ষণ ব্যর্থ হয়েছে' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // 4. Delete a User's File
  async deleteUserFile(mobile, fileId) {
    const cleanMobile = (mobile || '').replace(/[^0-9]/g, '');
    const docUrl = `${this.baseUrl}/users/${cleanMobile}/files/${fileId}?key=${this.apiKey}`;

    try {
      const res = await fetch(docUrl, { method: 'DELETE' });
      if (res.ok) {
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'ফাইল মোছা যায়নি' };
  },

  // 5. Master Admin: Get All Users
  async getAllUsersForAdmin() {
    const colUrl = `${this.baseUrl}/users?key=${this.apiKey}`;
    try {
      const res = await fetch(colUrl);
      if (!res.ok) return { success: false, users: [] };
      const data = await res.json();
      const users = (data.documents || []).map(doc => this.fromFirestoreDoc(doc)).filter(Boolean);
      return { success: true, users };
    } catch (err) {
      return { success: false, users: [], error: err.message };
    }
  },

  // 6. Customer Feedback: Submit Feedback (Website / Mobile / Portal)
  async submitFeedback(feedbackData) {
    const fbId = feedbackData.id || ('fb_' + Date.now());
    const docUrl = `${this.baseUrl}/feedbacks/${fbId}?key=${this.apiKey}`;

    const docBody = {
      id: fbId,
      name: feedbackData.name || 'গ্রাহক',
      contact: feedbackData.contact || '',
      category: feedbackData.category || 'সাধারণ মতামত',
      message: feedbackData.message || '',
      rating: Number(feedbackData.rating || 5),
      status: feedbackData.status || 'pending',
      date: feedbackData.date || new Date().toISOString()
    };

    try {
      const res = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: this.toFirestoreFields(docBody) })
      });
      if (res.ok) {
        return { success: true, feedback: docBody };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'ফিডব্যাক ক্লাউডে সংরক্ষণ করা যায়নি' };
  },

  // 7. Customer Feedback: Get All Feedbacks
  async getAllFeedbacks() {
    const colUrl = `${this.baseUrl}/feedbacks?key=${this.apiKey}`;
    try {
      const res = await fetch(colUrl);
      if (!res.ok) return { success: false, feedbacks: [] };
      const data = await res.json();
      const feedbacks = (data.documents || []).map(doc => this.fromFirestoreDoc(doc)).filter(Boolean);
      return { success: true, feedbacks };
    } catch (err) {
      return { success: false, feedbacks: [], error: err.message };
    }
  },

  // 8. Customer Feedback: Update Status (Approved / Pending)
  async updateFeedbackStatus(fbId, status = 'approved') {
    const docUrl = `${this.baseUrl}/feedbacks/${fbId}?updateMask.fieldPaths=status&key=${this.apiKey}`;
    try {
      const res = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { status: { stringValue: status } } })
      });
      return { success: res.ok };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // 9. Customer Feedback: Delete Feedback
  async deleteFeedback(fbId) {
    const docUrl = `${this.baseUrl}/feedbacks/${fbId}?key=${this.apiKey}`;
    try {
      const res = await fetch(docUrl, { method: 'DELETE' });
      return { success: res.ok };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // 10. Global Candidates Cloud Sync
  async saveGlobalCandidate(candData) {
    const candId = candData.id || ('cand_' + Date.now());
    const docUrl = `${this.baseUrl}/candidates/${candId}?key=${this.apiKey}`;
    candData.id = candId;
    candData.updatedAt = new Date().toISOString();

    try {
      const res = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: this.toFirestoreFields(candData) })
      });
      return { success: res.ok, candidate: candData };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getAllGlobalCandidates() {
    const colUrl = `${this.baseUrl}/candidates?key=${this.apiKey}`;
    try {
      const res = await fetch(colUrl);
      if (!res.ok) return { success: false, candidates: [] };
      const data = await res.json();
      const candidates = (data.documents || []).map(doc => this.fromFirestoreDoc(doc)).filter(Boolean);
      return { success: true, candidates };
    } catch (err) {
      return { success: false, candidates: [], error: err.message };
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FayzarFirebaseClient;
}
