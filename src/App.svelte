<script>
  let prediction = "";
  let inputText = "";
  let feedback = "";
  let saved_feedbacks = [];
  let userId = 1;  // Example user ID (replace with actual dynamic value)
  let isLoading = false;
  let errorMessage = "";

   // Function to call the /predict API
  async function getPrediction() {
    isLoading = true;
    errorMessage = "";
    try {
      const response = await fetch('http://127.0.0.1:8081/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await response.json();

      // Debugging: Check what data is returned from the API
      console.log("API Response:", data);

      // Check if the response contains the sentiment data
      if (data && data.label && data.score) {
        prediction = `Sentiment: ${data.label}, Confidence: ${data.score.toFixed(2)}`;
      } else {
        errorMessage = "No prediction result returned.";
      }

    } catch (error) {
      errorMessage = "Failed to fetch prediction. Please try again.";
    } finally {
      isLoading = false;
    }
  }

  // Function to send feedback to the /submit-feedback API
  async function sendFeedback() {
    try {
      await fetch('http://127.0.0.1:8081/submit-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, content: feedback }),
      });
      alert("Feedback submitted successfully!");
      feedback = "";
    } catch (error) {
      alert("Failed to submit feedback. Please try again.");
    }
  }

  // Function to fetch feedback for a user
  async function getFeedback() {
    isLoading = true;
    errorMessage = "";
    try {
      const response = await fetch(`http://127.0.0.1:8081/get-feedback/${userId}`);

      if (!response.ok) {
        throw new Error("No feedback found.");
      }

      const data = await response.json();
      saved_feedbacks = data.feedbacks;  // Set the feedback data

    } catch (error) {
      errorMessage = error.message || "Failed to fetch feedback.";
    } finally {
      isLoading = false;
    }
  }
</script>


<main>
  <h1>Prediction App</h1>
  <div>
    <input type="text" bind:value={inputText} placeholder="Enter your input" />
    <button on:click={getPrediction} disabled={isLoading}>
      {#if isLoading}
        Loading...
      {:else}
        Get Prediction
      {/if}
    </button>
  </div>

  {#if prediction}
    <div class="result">
      <h2>Prediction Result:</h2>
      <p>{prediction}</p> <!-- Display prediction result here -->
    </div>
  {/if}

  {#if errorMessage}
    <div class="error">
      <p>{errorMessage}</p> <!-- Display error message if any -->
    </div>
  {/if}

  <div class="feedback-section">
    <h2>Submit Feedback</h2>
    <textarea bind:value={feedback} placeholder="Enter your feedback"></textarea>
    <button on:click={sendFeedback}>Submit Feedback</button>
  </div>

    <div>
    <label for="userId">User ID:</label>
    <input type="number" bind:value={userId} id="userId" placeholder="Enter user ID" />
    <button on:click={getFeedback} disabled={isLoading}>
      {#if isLoading}
        Loading...
      {:else}
        Get Feedback
      {/if}
    </button>
  </div>

  {#if saved_feedbacks.length > 0}
    <div class="feedback-list">
      <h2>Feedback:</h2>
      <ul>
        {#each saved_feedbacks as feedback}
          <li>
            <strong>Feedback ID: {feedback.id}</strong><br>
            <strong>Content:</strong> {feedback.content}
          </li>
        {/each}
      </ul>
    </div>
  {/if}


</main>

<style>
  main {
    padding: 20px;
    max-width: 600px;
    margin: auto;
  }
  .result, .error, .feedback-section {
    margin-top: 20px;
  }
  input, textarea {
    width: 100%;
    margin-bottom: 10px;
  }
  button {
    display: block;
    margin-top: 10px;
  }
  .error p {
    color: red;
  }
</style>
