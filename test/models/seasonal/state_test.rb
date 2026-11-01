require "test_helper"

class Seasonal::StateTest < ActiveSupport::TestCase
  setup do
    @dir = Dir.mktmpdir
    @original_path = Seasonal::State.path
    Seasonal::State.path = File.join(@dir, "nested", "seasonal_state.json")
  end

  teardown do
    Seasonal::State.path = @original_path
    FileUtils.rm_rf(@dir)
  end

  test "starts empty and merges keys" do
    state = Seasonal::State.new
    assert_equal({}, state.read)

    state.write("advent.opened", [ 1, 2 ])
    result = state.write("gifts.mam", { "done" => true })

    assert_equal({ "advent.opened" => [ 1, 2 ], "gifts.mam" => { "done" => true } }, result)
    assert_equal result, Seasonal::State.new.read
    assert_empty Dir.glob(File.join(@dir, "nested", "*.tmp"))
  end

  test "overwrites an existing key" do
    Seasonal::State.new.write("advent.opened", [ 1 ])
    assert_equal({ "advent.opened" => [ 1, 2 ] }, Seasonal::State.new.write("advent.opened", [ 1, 2 ]))
  end

  test "rejects invalid keys" do
    [ "", "has space", "../etc", "a" * 81, nil, 5 ].each do |key|
      assert_raises(Seasonal::State::Invalid) { Seasonal::State.new.write(key, 1) }
    end
  end

  test "rejects a state larger than the cap" do
    assert_raises(Seasonal::State::Invalid) { Seasonal::State.new.write("big", "x" * Seasonal::State::MAX_BYTES) }
    assert_equal({}, Seasonal::State.new.read)
  end
end
